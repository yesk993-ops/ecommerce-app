variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "eks_security_group_id" { type = string }
variable "db_username" { type = string; default = "ecommerce" }
variable "db_password" { type = string; sensitive = true }
variable "instance_class" { type = string; default = "db.t3.medium" }
variable "allocated_storage" { type = number; default = 100 }
variable "max_allocated_storage" { type = number; default = 500 }
variable "backup_retention_days" { type = number; default = 35 }
variable "multi_az" { type = bool; default = true }
variable "deletion_protection" { type = bool; default = true }
