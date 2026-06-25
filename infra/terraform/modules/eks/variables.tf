variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "kubernetes_version" { type = string; default = "1.29" }
variable "node_instance_types" { type = list(string); default = ["t3.medium"] }
variable "node_disk_size" { type = number; default = 50 }
variable "node_desired_size" { type = number; default = 3 }
variable "node_min_size" { type = number; default = 2 }
variable "node_max_size" { type = number; default = 10 }
