#!/bin/bash

# Backup script voor Richting Kennisbank
# Dit script maakt automatisch een commit en push naar GitHub

set -e

REPO_DIR="/Users/larsschreurer/Desktop/richting-kennisbank"
cd "$REPO_DIR"

# Check of we in een git repository zijn
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Geen Git repository gevonden. Initialiseer eerst Git."
    exit 1
fi

# Check of er een remote is ingesteld
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  Geen remote repository ingesteld."
    echo "   Maak eerst een repository op GitHub en voeg de remote toe:"
    echo "   git remote add origin https://github.com/JOUW-USERNAME/richting-kennisbank.git"
    exit 1
fi

# Check of er wijzigingen zijn
if git diff --quiet && git diff --cached --quiet; then
    echo "✅ Geen wijzigingen om te committen."
    exit 0
fi

# Voeg alle wijzigingen toe
echo "📦 Wijzigingen toevoegen..."
git add -A

# Maak commit met timestamp
COMMIT_MSG="Backup: $(date '+%Y-%m-%d %H:%M:%S')"
echo "💾 Commit maken: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" || {
    echo "⚠️  Geen nieuwe wijzigingen om te committen."
    exit 0
}

# Push naar GitHub
echo "🚀 Pushen naar GitHub..."
git push origin main || {
    echo "❌ Push gefaald. Probeer handmatig: git push origin main"
    exit 1
}

echo "✅ Backup succesvol voltooid!"






