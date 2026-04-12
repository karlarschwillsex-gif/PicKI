# ============================================================
#  PicKI-Elements – Start Script
# ============================================================
SCRIPT_DIR="/media/fynn/Intel-1TB-Intern/.PicKI-Elements"
LOG_DIR="$SCRIPT_DIR/logs"
VENV_DIR="$SCRIPT_DIR/backend/venv"
COMFY_DIR="$SCRIPT_DIR/backend/ComfyUI"
ELECTRON_DIR="$SCRIPT_DIR/electron"
PID_FILE="$SCRIPT_DIR/.pids"
mkdir -p "$LOG_DIR"
> "$PID_FILE"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}"
echo "  ██████╗ ██╗ ██████╗██╗  ██╗██╗"
echo "  ██╔══██╗██║██╔════╝██║ ██╔╝██║"
echo "  ██████╔╝██║██║     █████╔╝ ██║"
echo "  ██╔═══╝ ██║██║     ██╔═██╗ ██║"
echo "  ██║     ██║╚██████╗██║  ██╗██║"
echo "  ╚═╝     ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝"
echo ""
echo "  ███████╗██╗     ███████╗███╗   ███╗███████╗███╗   ██╗████████╗███████╗"
echo "  ██╔════╝██║     ██╔════╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔════╝"
echo "  █████╗  ██║     █████╗  ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████╗"
echo "  ██╔══╝  ██║     ██╔══╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║"
echo "  ███████╗███████╗███████╗██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ███████║"
echo "  ╚══════╝╚══════╝╚══════╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝"
echo -e "${NC}"
echo -e "${YELLOW}  Charakter-Design Studio | Schritt fuer Schritt${NC}"
echo ""

# --- Prüfe ob ComfyUI vorhanden ---
if [ ! -d "$COMFY_DIR" ]; then
    echo -e "${RED}[FEHLER] ComfyUI nicht gefunden!${NC}"
    exit 1
fi

# --- Starte ComfyUI Backend ---
echo -e "${GREEN}[1/2] Starte KI-Backend (ComfyUI)...${NC}"
"$VENV_DIR/bin/python3" "$COMFY_DIR/main.py" \
    --listen 127.0.0.1 \
    --port 8188 \
    --cpu --preview-method auto \
    --disable-cuda-malloc \
    > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID >> "$PID_FILE"
echo -e "  PID: ${CYAN}$BACKEND_PID${NC}"

# --- Warte bis Backend bereit ---
echo -e "${YELLOW}  Warte auf Backend (Pony XL braucht 2-3 Minuten beim ersten Start)...${NC}"
MAX_WAIT=300
COUNT=0
while ! curl -s http://127.0.0.1:8188/system_stats > /dev/null 2>&1; do
    sleep 3
    COUNT=$((COUNT+3))
    if [ $COUNT -ge $MAX_WAIT ]; then
        echo -e "${RED}[FEHLER] Backend startet nicht. Prüfe logs/backend.log${NC}"
        exit 1
    fi
    echo -ne "  Warte... ${COUNT}s / ${MAX_WAIT}s\r"
done
echo -e "\n${GREEN}  Backend ist bereit! ✓${NC}"

# --- Starte Electron App ---
echo -e "${GREEN}[2/2] Starte PicKI-Elements App...${NC}"
cd "$ELECTRON_DIR"
./node_modules/.bin/electron . --no-sandbox > "$LOG_DIR/electron.log" 2>&1 &
ELECTRON_PID=$!
echo $ELECTRON_PID >> "$PID_FILE"
echo -e "  PID: ${CYAN}$ELECTRON_PID${NC}"
echo ""
echo -e "${MAGENTA}✓ PicKI-Elements laeuft!${NC}"
echo -e "  Backend: ${CYAN}http://127.0.0.1:8188${NC}"
echo -e "  Zum Stoppen: ${YELLOW}./stop.sh${NC}"
