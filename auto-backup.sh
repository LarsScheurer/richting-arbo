#!/bin/bash
# Automatische backup script - draait in de achtergrond tijdens ontwikkeling
# Gebruik: ./auto-backup.sh &
# Stop: pkill -f auto-backup.sh

REPO_DIR="/Users/larsschreurer/Desktop/richting-kennisbank"
cd "$REPO_DIR"

echo "🔄 Automatische backup gestart (elke 5 minuten)"
echo "   Stop met: pkill -f auto-backup.sh"

while true; do
  sleep 300  # 5 minuten
  
  # Check of er wijzigingen zijn
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "[$(date '+%H:%M:%S')] 📦 Wijzigingen gedetecteerd, backup maken..."
    
    # Maak backup van belangrijke bestanden
    if [ -f "App.tsx" ]; then
      cp App.tsx "App.tsx.backup-$(date +%Y%m%d-%H%M%S)"
    fi
    
    # Commit en push
    git add -A
    git commit -m "Auto-backup: $(date '+%Y-%m-%d %H:%M:%S')" > /dev/null 2>&1
    git push origin main > /dev/null 2>&1
    
    echo "[$(date '+%H:%M:%S')] ✅ Backup voltooid"
  fi
done

