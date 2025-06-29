Aegilock API – Webseiten-Schutz über ML-basierte Bot-Erkennung
Aegilock schützt Ihre Webseite automatisch und unsichtbar vor unerwünschten automatisierten Zugriffen (Bots), Spam-Attacken und Formularmissbrauch.

Wie funktioniert der Schutzmechanismus?
Aegilock verwendet ein intelligentes, Machine-Learning-gestütztes Scoring-System, um jeden eingehenden Zugriff in Echtzeit zu analysieren. Dazu werden technische Signale des Browsers, des User-Agents, des Verhaltens und des Inhalts verwendet, um automatisierte Bots zuverlässig zu erkennen. Erkannte Bot-Zugriffe werden unmittelbar blockiert, während menschliche Benutzer die Webseite ohne Einschränkungen nutzen können.

Nach der Integration sind Ihre gesamte Webseite, inklusive aller Formulare, automatisch geschützt. Es ist keine zusätzliche Interaktion der Nutzer notwendig.

Einbindung in Ihre Webseite
Die Einbindung erfolgt einfach per JavaScript auf Ihrer Webseite.

1. Integrieren Sie folgenden JavaScript-Code direkt vor dem schließenden </body>-Tag auf allen HTML-Seiten, die Sie schützen möchten:

html
Kopieren
Bearbeiten
<script src="https://aegilock.de/aegilock-protect.js" data-sitekey="IHR_SITEKEY"></script>
Ersetzen Sie dabei IHR_SITEKEY mit dem individuellen Sitekey, den Sie von Aegilock erhalten haben.

Beispiel:

<script src="https://aegilock.de/aegilock-protect.js" data-sitekey="grabbeltier5"></script>
API-Integration (optional)
Sie können zusätzlich direkt die Aegilock REST-API verwenden, um Zugriffe manuell zu validieren:

curl -X POST https://aegilock.de/api/predict \
-H "Content-Type: application/json" \
-H "X-Site-Key: IHR_SITEKEY" \
-d '{"timestamp":"2025-06-29T20:00:00Z","ip":"127.0.0.1","path":"/","ua":"Browser-Agent","referrer":"","status":200}'
Ein gültiger Sitekey liefert das Ergebnis des ML-Modells zurück, zum Beispiel:
{
  "bot_score": 0.006,
  "blocked": false,
  "threshold": 0.32
}
Ein ungültiger oder deaktivierter Sitekey erzeugt eine Fehlermeldung:

{
  "error": "Ungültiger Sitekey"
}
Test & Validierung
Prüfen Sie Ihre Einbindung, indem Sie Ihre Webseite besuchen.

Die Browser-Konsole (F12) zeigt den aktuellen Bot-Score zur Diagnose an.

Formulare und weitere Seiteninhalte werden automatisch mitgeschützt.

Support & Hilfe
Bei Fragen oder Unterstützungsbedarf erreichen Sie uns unter:
kontakt@aegilock.de

© 2025 Aegilock | Datenschutzkonforme Bot-Erkennung aus Deutschland

Lizenz:
MIT License – siehe LICENSE.txt
