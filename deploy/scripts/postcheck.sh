#!/usr/bin/env bash
# Post-deploy check for a sitectl site. Usage: sudo bash deploy/scripts/postcheck.sh paramistech paramistech.ir
SITE="${1:-paramistech}"; DOMAIN="${2:-paramistech.ir}"
ok(){ echo -e "  \e[32m✔\e[0m $*"; }; bad(){ echo -e "  \e[31m✘\e[0m $*"; FAIL=1; }
FAIL=0
MYIP=$(curl -4 -s -m 8 https://api.ipify.org || hostname -I | awk '{print $1}')
echo "Server public IP: $MYIP"
echo "== DNS"
for d in "$DOMAIN" "www.$DOMAIN"; do
  ip=$(getent ahostsv4 "$d" | awk 'NR==1{print $1}')
  if [ "$ip" = "$MYIP" ]; then ok "$d → $ip"; else bad "$d → ${ip:-none} (should be $MYIP)"; fi
done
echo "== Service"
systemctl is-active --quiet "site-$SITE" && ok "site-$SITE active" || bad "site-$SITE not running (journalctl -u site-$SITE -n 80)"
PORT=$(sitectl status "$SITE" 2>/dev/null | awk -v s="$SITE" '$1==s{print $2}')
[ -n "$PORT" ] && curl -s -m 5 -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/" | grep -q 200 && ok "app answers on :$PORT" || bad "app not answering locally"
echo "== Nginx"
nginx -t >/dev/null 2>&1 && ok "nginx config valid" || bad "nginx -t failed"
curl -s -m 5 -H "Host: $DOMAIN" -o /dev/null -w "%{http_code}" http://127.0.0.1/ | grep -qE "200|301|308" && ok "nginx serves $DOMAIN" || bad "nginx does not route $DOMAIN"
echo "== Firewall"
if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw status | grep -qE "^(80|Nginx)" && ok "port 80 open" || bad "open: sudo ufw allow 'Nginx Full'"
else ok "ufw inactive"; fi
echo "== HTTPS"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then ok "certificate exists"; curl -s -m 8 -o /dev/null -w "%{http_code}" "https://$DOMAIN/" | grep -q 200 && ok "https://$DOMAIN up" || bad "https not reachable"
else bad "no certificate yet → after DNS is fixed: sudo sitectl ssl $SITE"; fi
[ $FAIL = 0 ] && echo -e "\n\e[32mAll good.\e[0m" || echo -e "\n\e[31mFix the ✘ items above.\e[0m"
exit $FAIL
