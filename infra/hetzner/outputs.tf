output "server_name" {
  description = "Created Hetzner server name."
  value       = hcloud_server.app.name
}

output "ipv4_address" {
  description = "Public IPv4 address."
  value       = hcloud_server.app.ipv4_address
}

output "ipv6_address" {
  description = "Public IPv6 network."
  value       = hcloud_server.app.ipv6_address
}

output "app_url" {
  description = "Expected public URL after DNS and optional HTTPS are configured."
  value       = local.app_origin
}

output "ssh_command" {
  description = "SSH command to connect after deployment."
  value       = "ssh ${var.admin_username}@${hcloud_server.app.ipv4_address}"
}

output "next_steps" {
  description = "Manual steps after the first apply."
  value = [
    "Controleer of ${var.domain} naar ${hcloud_server.app.ipv4_address} wijst voordat je HTTPS activeert of Stripe live zet.",
    "Log in met ${var.admin_username} en controleer cloud-init: sudo journalctl -u cloud-init -b.",
    "Controleer de appstatus met: sudo systemctl status casa-serra-larga en sudo nginx -t.",
    "Maak daarna direct een extra backup van /opt/casa-serra-larga/data/ en van het .env-bestand."
  ]
}