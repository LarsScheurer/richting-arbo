# GitHub Repository Setup

## Stap 1: Maak een nieuwe repository op GitHub

1. Ga naar https://github.com/new
2. Repository naam: `richting-kennisbank`
3. Beschrijving: "Richting Kennisbank - Interne kennisbank applicatie"
4. **Belangrijk**: Laat het leeg (geen README, .gitignore, of licentie)
5. Klik op "Create repository"

## Stap 2: Kopieer de repository URL

Na het aanmaken zie je een pagina met instructies. Kopieer de HTTPS URL, bijvoorbeeld:
```
https://github.com/LarsScheurer/richting-kennisbank.git
```

## Stap 3: Voeg de remote toe

Run dit commando (vervang de URL met jouw repository URL):
```bash
cd /Users/larsschreurer/Desktop/richting-kennisbank
git remote add origin https://github.com/LarsScheurer/richting-kennisbank.git
```

## Stap 4: Push de code naar GitHub

```bash
git push -u origin main
```

## Stap 5: Test het backup script

```bash
./backup-to-github.sh
```

## Automatische Backups

Het script `backup-to-github.sh` maakt automatisch een commit en push naar GitHub.

**Handmatig backup maken:**
```bash
./backup-to-github.sh
```

**Automatisch backup (optioneel - via cron):**
Je kunt het script ook automatisch laten draaien, bijvoorbeeld elke dag om 18:00:
```bash
# Open crontab editor
crontab -e

# Voeg deze regel toe (elke dag om 18:00):
0 18 * * * /Users/larsschreurer/Desktop/richting-kennisbank/backup-to-github.sh >> /tmp/github-backup.log 2>&1
```

## Belangrijk

- Het script maakt alleen een commit als er wijzigingen zijn
- Het script pusht automatisch naar de `main` branch
- Als de push faalt, moet je handmatig pushen: `git push origin main`



