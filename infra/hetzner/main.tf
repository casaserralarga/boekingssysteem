terraform {
  required_version = ">= 1.6.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.60"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

locals {
  app_name        = "casa-serra-larga"
  fqdn            = trimspace(var.domain)
  app_origin      = trimspace(var.letsencrypt_email) == "" ? "http://${local.fqdn}" : "https://${local.fqdn}"
  app_repo_branch = trimspace(var.app_repo_branch) == "" ? "main" : trimspace(var.app_repo_branch)
  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_username    = var.admin_username
    app_name          = local.app_name
    app_directory     = "/opt/casa-serra-larga"
    app_origin        = local.app_origin
    app_port          = 3000
    app_repo_branch   = local.app_repo_branch
    app_repo_url      = var.app_repo_url
    hold_ttl_minutes  = var.hold_ttl_minutes
    letsencrypt_email = var.letsencrypt_email
    public_hostname   = local.fqdn
    session_ttl_days  = var.session_ttl_days
    ssh_public_key    = file(var.ssh_public_key_path)
    stripe_secret_key = var.stripe_secret_key
  })
}

resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = file(var.ssh_public_key_path)
}

resource "hcloud_firewall" "app" {
  name = "${var.server_name}-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = [var.ssh_allowed_cidr]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_server" "app" {
  name        = var.server_name
  server_type = var.server_type
  image       = var.image
  location    = var.location
  backups     = var.enable_backups
  ssh_keys    = [hcloud_ssh_key.admin.id]
  firewall_ids = [
    hcloud_firewall.app.id,
  ]
  user_data = local.cloud_init

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    app         = local.app_name
    environment = var.environment
    managed_by  = "terraform"
  }

  lifecycle {
    ignore_changes = [ssh_keys]
  }
}