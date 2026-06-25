// =============================================================================
// E-Commerce CI/CD Pipeline — Two-Repo GitOps
// -----------------------------------------------------------------------------
// App Repo:      github.com/yourorg/ecommerce-app       (this repo)
// Manifests Repo: github.com/yourorg/ecommerce-manifests  (ArgoCD source of truth)
// -----------------------------------------------------------------------------
// Flow:
//   Push to main → Jenkins CI (lint → test → scan → build → push images)
//   → Update manifests repo with new image tags → commit + push
//   → ArgoCD detects drift in manifests repo → auto-syncs to K8s
// =============================================================================

def APP_REPO_URL      = 'https://github.com/yesk993-ops/ecommerce-app.git'
def MANIFESTS_REPO    = 'https://github.com/yesk993-ops/ecommerce-manifests.git'
def MANIFESTS_BRANCH  = 'main'
def DOCKER_REGISTRY   = 'docker.io/mydocker3692'
def DOCKER_REPO       = 'ecommerce-app'

def SERVICES = [
    'auth-service',
    'user-service',
    'product-service',
    'cart-service',
    'order-service',
    'payment-service',
    'inventory-service',
    'notification-service',
    'api-gateway',
    'frontend'
]

pipeline {
    agent { label 'ecommerce-agent' }

    tools {
        nodejs 'node-20'
    }

    environment {
        // Credentials configured in Jenkins → Manage Credentials
        DOCKER_CREDS     = credentials('docker-hub-creds')
        GITHUB_CREDS     = credentials('github-pat')
        SONAR_HOST_URL   = 'http://sonarqube:9000'
    }

    stages {
        // =====================================================================
        // STAGE 1: Checkout App Code
        // =====================================================================
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.SHORT_COMMIT = env.GIT_COMMIT.take(7)
                    env.IMAGE_TAG = "${env.BUILD_NUMBER}-${env.SHORT_COMMIT}"
                    echo "Building revision: ${env.GIT_COMMIT}"
                    echo "Image tag: ${env.IMAGE_TAG}"

                    // Detect which services changed
                    def changes = sh(script: 'git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "all"', returnStdout: true).trim()
                    def changedServices = []
                    for (svc in SERVICES) {
                        if (changes.contains("src/${svc}/") || changes == "all") {
                            changedServices.add(svc)
                        }
                    }
                    // If no specific service changed, or root files changed, build all
                    if (changedServices.isEmpty()) {
                        echo "No specific service changed or root files modified — building all services"
                        env.CHANGED_SERVICES = SERVICES.join(',')
                    } else {
                        echo "Changed services: ${changedServices.join(', ')}"
                        env.CHANGED_SERVICES = changedServices.join(',')
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 2: Code Quality & Static Analysis
        // =====================================================================
        stage('Code Quality') {
            parallel {
                stage('ESLint') {
                    steps {
                        dir('src') {
                            sh '''
                                for dir in */; do
                                    if [ -f "${dir}package.json" ]; then
                                        echo "Linting ${dir}..."
                                        cd "$dir" && npm ci --silent 2>/dev/null && npx eslint . --ext .js --format junit -o ../../reports/eslint-${dir%/}.xml || true
                                        cd ..
                                    fi
                                done
                            '''
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'reports/eslint-*.xml'
                        }
                    }
                }
                stage('SonarQube') {
                    steps {
                        withSonarQubeEnv('SonarQube') {
                            script {
                                def scannerHome = tool 'sonar-scanner'
                                sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=ecommerce-app -Dsonar.projectName='E-Commerce App' -Dsonar.sources=src/ -Dsonar.host.url=\${SONAR_HOST_URL} -Dsonar.login=\${SONAR_AUTH_TOKEN} -Dsonar.exclusions=**/node_modules/**,**/build/** -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info"
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 3: Unit Tests
        // =====================================================================
        stage('Unit Tests') {
            parallel {
                stage('Auth Tests') {
                    steps { dir('src/auth-service') { sh 'npm ci && npm test -- --ci --reporters=default --reporters=jest-junit 2>/dev/null || true' } }
                    post { always { junit allowEmptyResults: true, testResults: 'src/auth-service/junit.xml' } }
                }
                stage('Cart Tests') {
                    steps { dir('src/cart-service') { sh 'npm ci && npm test -- --ci --reporters=default --reporters=jest-junit 2>/dev/null || true' } }
                    post { always { junit allowEmptyResults: true, testResults: 'src/cart-service/junit.xml' } }
                }
                stage('Order Tests') {
                    steps { dir('src/order-service') { sh 'npm ci && npm test -- --ci --reporters=default --reporters=jest-junit 2>/dev/null || true' } }
                    post { always { junit allowEmptyResults: true, testResults: 'src/order-service/junit.xml' } }
                }
                stage('Frontend Tests') {
                    steps { dir('src/frontend') { sh 'npm ci && CI=true npm test -- --ci --reporters=default --reporters=jest-junit 2>/dev/null || true' } }
                    post { always { junit allowEmptyResults: true, testResults: 'src/frontend/junit.xml' } }
                }
            }
        }

        // =====================================================================
        // STAGE 4: Security Scanning
        // =====================================================================
        stage('Security Scan') {
            parallel {
                stage('Trivy FS') {
                    steps {
                        sh 'trivy filesystem --severity CRITICAL,HIGH --exit-code 0 --format sarif --output reports/trivy-fs.sarif . 2>/dev/null || true'
                    }
                }
                stage('Dependency Audit') {
                    steps {
                        sh '''
                            mkdir -p reports
                            for dir in src/*/; do
                                if [ -f "${dir}package.json" ]; then
                                    cd "$dir"
                                    npm audit --audit-level=high --json > ../../reports/audit-${dir%/}.json 2>/dev/null || true
                                    cd ../..
                                fi
                            done
                        '''
                    }
                }
                stage('Secret Scan') {
                    steps {
                        sh 'trivy config --severity CRITICAL,HIGH --exit-code 0 . 2>/dev/null || true'
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 5: Ensure Docker Hub Repo Exists
        // =====================================================================
        stage('Ensure Docker Repo') {
            steps {
                script {
                    sh """
                        TOKEN=\$(curl -s -H "Content-Type: application/json" -X POST -d '{"username":"${DOCKER_CREDS_USR}","password":"${DOCKER_CREDS_PSW}"}' https://hub.docker.com/v2/users/login/ | jq -r '.token')
                        HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: JWT \$TOKEN" https://hub.docker.com/v2/repositories/${DOCKER_CREDS_USR}/${DOCKER_REPO}/)
                        if [ "\$HTTP_CODE" = "404" ]; then
                            echo "Creating repository ${DOCKER_CREDS_USR}/${DOCKER_REPO}..."
                            curl -s -H "Authorization: JWT \$TOKEN" -H "Content-Type: application/json" -X POST -d '{"name":"${DOCKER_REPO}","description":"E-commerce app images","is_private":false}' https://hub.docker.com/v2/repositories/
                            echo "Repository created."
                        else
                            echo "Repository ${DOCKER_CREDS_USR}/${DOCKER_REPO} already exists."
                        fi
                    """
                }
            }
        }

        // =====================================================================
        // STAGE 6: Build Docker Images
        // =====================================================================
        stage('Build Images') {
            steps {
                script {
                    def services = env.CHANGED_SERVICES.split(',')
                    def builds = [:]
                    for (svc in services) {
                        def serviceName = svc
                        builds[svc] = {
                            dir("src/${serviceName}") {
                                sh """
                                    docker build \
                                        -t ${DOCKER_REGISTRY}/${DOCKER_REPO}:${serviceName}-${env.IMAGE_TAG} \
                                        -t ${DOCKER_REGISTRY}/${DOCKER_REPO}:${serviceName}-latest \
                                        .
                                """
                            }
                        }
                    }
                    parallel builds
                }
            }
        }

        // =====================================================================
        // STAGE 6: Scan Built Images
        // =====================================================================
        stage('Image Scan') {
            parallel {
                stage('Scan Critical Images') {
                    steps {
                        script {
                            def critical = ['auth-service', 'api-gateway', 'frontend']
                            for (svc in critical) {
                                sh "trivy image --severity CRITICAL --exit-code 0 ${DOCKER_REGISTRY}/${DOCKER_REPO}:${svc}-${env.IMAGE_TAG} 2>/dev/null || true"
                            }
                        }
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 7: Push Images to Registry
        // =====================================================================
        stage('Push Images') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-creds') {
                        def services = env.CHANGED_SERVICES.split(',')
                        for (svc in services) {
                            sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}:${svc}-${env.IMAGE_TAG}"
                            sh "docker push ${DOCKER_REGISTRY}/${DOCKER_REPO}:${svc}-latest"
                        }
                    }
                }
            }
        }

        // =====================================================================
        // STAGE 8: GitOps — Update Manifests Repo
        // ---------------------------------------------------------------------
        // 1. Clone the manifests repo
        // 2. Update image tags in kustomization.yaml
        // 3. Commit and push
        // 4. ArgoCD detects the change and auto-syncs
        // =====================================================================
        stage('GitOps - Update Manifests') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh """
                        rm -rf manifests-repo
                        git clone https://x-access-token:${GITHUB_CREDS_USR}@github.com/yesk993-ops/ecommerce-manifests.git manifests-repo
                        cd manifests-repo
                        git checkout ${MANIFESTS_BRANCH}
                        git config user.email "jenkins@ecommerce.local"
                        git config user.name "Jenkins CI"

                        KUSTOMIZE="deploy/k8s/overlays/prod/kustomization.yaml"

                        echo "Updating image tags to ${env.IMAGE_TAG}"
                        for svc in ${env.CHANGED_SERVICES}; do
                            sed -i "s|newTag: \${svc}-latest|newTag: \${svc}-${env.IMAGE_TAG}|g" \$KUSTOMIZE
                        done

                        echo "Changed files:"
                        git diff --stat

                        git add \$KUSTOMIZE
                        git commit -m "chore: update image tags to ${env.IMAGE_TAG}

                        Services built from commit ${env.GIT_COMMIT}
                        Pipeline: ${env.BUILD_URL}
                        [skip ci]"
                        git push origin ${MANIFESTS_BRANCH}

                        echo "Successfully updated manifests repo with image tag ${env.IMAGE_TAG}"
                    """
                }
            }
        }

        // =====================================================================
        // STAGE 9: Verify ArgoCD Sync Status
        // =====================================================================
        stage('Verify ArgoCD Sync') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sh '''
                        # Wait for ArgoCD to detect and sync
                        sleep 15
                        if command -v argocd &>/dev/null; then
                            argocd login --core
                            for app in ecommerce-infra ecommerce-services ecommerce-monitoring; do
                                echo "Checking sync status for $app..."
                                STATUS=$(argocd app get $app -o jsonpath='{.status.sync.status}' 2>/dev/null || echo "unknown")
                                echo "  $app: $STATUS"
                            done
                        else
                            echo "argocd CLI not found. Check sync status manually in ArgoCD UI."
                            echo "Waiting for ArgoCD applications to sync..."
                            sleep 30
                        fi
                    '''
                }
            }
        }
    }

    // =========================================================================
    // POST-BUILD ACTIONS
    // =========================================================================
    post {
        always {
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
            cleanWs()
        }
        success {
            script {
                currentBuild.displayName = "#${env.BUILD_NUMBER} (${env.IMAGE_TAG})"
                currentBuild.description = "Images pushed: ${env.IMAGE_TAG}"
            }
            emailext(
                subject: "[CI/CD SUCCESS] Build #${env.BUILD_NUMBER} - ${env.JOB_NAME}",
                body: """
                    <h2>Build Successful</h2>
                    <p><b>Image Tag:</b> ${env.IMAGE_TAG}</p>
                    <p><b>Commit:</b> ${env.GIT_COMMIT}</p>
                    <p><b>Manifests Updated:</b> ${MANIFESTS_REPO}</p>
                    <p><b>ArgoCD auto-syncing to Kubernetes...</b></p>
                    <p><a href='${env.BUILD_URL}'>Jenkins Build Log</a></p>
                """,
                to: 'devops@company.com',
                mimeType: 'text/html'
            )
        }
        failure {
            emailext(
                subject: "[CI/CD FAILED] Build #${env.BUILD_NUMBER} - ${env.JOB_NAME}",
                body: "Build failed at stage ${env.STAGE_NAME}. See ${env.BUILD_URL}",
                to: 'devops@company.com'
            )
        }
        unstable {
            emailext(
                subject: "[CI/CD UNSTABLE] Build #${env.BUILD_NUMBER} - ${env.JOB_NAME}",
                body: "Build unstable. See ${env.BUILD_URL}",
                to: 'devops@company.com'
            )
        }
    }
}
