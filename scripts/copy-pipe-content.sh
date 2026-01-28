#!/bin/bash

# Script pour copier le contenu des pipes dans le presse-papiers
# Usage: ./scripts/copy-pipe-content.sh [seller_kpis|sellers]

PIPE_NAME=$1

if [ -z "$PIPE_NAME" ]; then
    echo "Usage: ./scripts/copy-pipe-content.sh [seller_kpis|sellers]"
    echo ""
    echo "Exemple:"
    echo "  ./scripts/copy-pipe-content.sh seller_kpis"
    echo ""
    exit 1
fi

PIPE_FILE="pipes/${PIPE_NAME}.pipe"

if [ ! -f "$PIPE_FILE" ]; then
    echo "❌ Fichier non trouvé: $PIPE_FILE"
    exit 1
fi

# Copier dans le presse-papiers
cat "$PIPE_FILE" | pbcopy

echo "✅ Contenu de $PIPE_NAME copié dans le presse-papiers!"
echo ""
echo "Maintenant:"
echo "1. Va sur https://app.tinybird.co/workspace/trac/pipes"
echo "2. Clique sur 'New Pipe'"
echo "3. Nomme-le: $PIPE_NAME"
echo "4. Colle (Cmd+V) le contenu"
echo "5. Clique sur 'Save'"
echo ""
