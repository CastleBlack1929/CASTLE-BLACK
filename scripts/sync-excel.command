#!/bin/bash
cd "$(dirname "$0")/.."

export PATH="$HOME/bin:$PATH"

echo "======================================================"
echo "  CASTLE BLACK — Sync Excel → Dashboard"
echo "======================================================"
echo ""

# 1. Sync
python3 scripts/sync_excel.py
if [ $? -ne 0 ]; then
  echo ""
  echo "ERROR: Falló el sync. Revisa que OneDrive esté sincronizado."
  read -p "Presiona Enter para cerrar..."
  exit 1
fi

# 2. Verificar si hay cambios para commitear
if git diff --quiet data/ ; then
  echo ""
  echo "✓ Sin cambios nuevos — dashboard ya está actualizado."
  echo ""
  read -p "Presiona Enter para cerrar..."
  exit 0
fi

# 3. Commit
FECHA=$(date "+%d/%m/%Y %H:%M")
git add data/movimientos.js data/usuarios/
git commit -m "sync $FECHA — Excel → dashboard"

# 4. Push
echo ""
echo "Subiendo a GitHub Pages..."
git push origin main

echo ""
echo "======================================================"
echo "  ✓ LISTO — castleblack.company actualizado en ~1 min"
echo "======================================================"
echo ""
read -p "Presiona Enter para cerrar..."
