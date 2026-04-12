# ============================================================
#  PicKI-Elements – Stop Script
# ============================================================
SCRIPT_DIR="/media/fynn/Intel-1TB-Intern/.PicKI-Elements"
PID_FILE="$SCRIPT_DIR/.pids"
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}[PicKI-Elements] Stoppe alle Prozesse...${NC}"

if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo -e "  ${GREEN}✓ Prozess $pid beendet${NC}"
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Aufräumen
pkill -f "ComfyUI/main.py" 2>/dev/null
pkill -f "electron" 2>/dev/null

# RAM freigeben
sync
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 || true

echo -e "${GREEN}✓ PicKI-Elements gestoppt!${NC}"
