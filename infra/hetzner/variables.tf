variable "hcloud_token" {
  description = "Hetzner Cloud API token."
  type        = string
  sensitive   = true
}

variable "server_name" {
  description = "Server name in Hetzner Cloud."
  type        = string
  default     = "casa-serra-larga"
}

variable "environment" {
  description = "Deployment environment label."
  type        = string
  default     = "production"
}

variable "location" {
  description = "Hetzner location, for example fsn1, nbg1 or hel1."
  type        = string
  default     = "fsn1"
}

variable "server_type" {
  description = "Hetzner server type. cpx11 is a safe low-cost x86 default for this Node + Prisma + SQLite app."
  type        = string
  default     = "cpx11"
}

variable "image" {
  description = "Hetzner image name."
  type        = string
  default     = "ubuntu-24.04"
}

variable "enable_backups" {
  description = "Enable Hetzner automatic server backups."
  type        = bool
  default     = true
}

variable "admin_username" {
  description = "Linux admin username to create on the VPS."
  type        = string
  default     = "deploy"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key that should be injected into the server."
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to connect over SSH. Restrict this to your own public IP in production."
  type        = string
  default     = "0.0.0.0/0"
}

variable "domain" {
  description = "Public domain name for the app, for example reserveren.jouwdomein.nl."
  type        = string
}

variable "letsencrypt_email" {
  description = "Email address for Let's Encrypt. Leave empty to skip HTTPS provisioning during bootstrap."
  type        = string
  default     = ""
}

variable "app_repo_url" {
  description = "Git repository URL to clone on the server."
  type        = string
}

variable "app_repo_branch" {
  description = "Git branch to deploy from."
  type        = string
  default     = "main"
}

variable "session_ttl_days" {
  description = "Session lifetime in days."
  type        = number
  default     = 7
}

variable "hold_ttl_minutes" {
  description = "Temporary booking hold lifetime in minutes."
  type        = number
  default     = 10
}

variable "stripe_secret_key" {
  description = "Stripe secret key for production."
  type        = string
  default     = ""
  sensitive   = true
}