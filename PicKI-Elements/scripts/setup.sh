#!/bin/bash
# ============================================================
#  RealiMorph – Setup Script (ComfyUI Edition)
#  Installiert: ComfyUI, Modelle, rembg, Electron
# ============================================================

ROOT_DIR="/media/fynn/Intel-1TB-Intern/.Foto-KI-I2I"
SCRIPT_DIR="$ROOT_DIR/scripts"
LOG="$ROOT_DIR/logs/setup.log"
VENV_DIR="$ROOT_DIR/backend/venv"
COMFY_DIR="$ROOT_DIR/backend/ComfyUI"
MODELS_DIR="$COMFY_DIR/models/checkpoints"
CONTROLNET_DIR="$COMFY_DIR/models/controlnet"
UPSCALE_DIR="$COMFY_DIR/models/upscale_models"
ELECTRON_DIR="$ROOT_DIR/electron"

mkdir -p "$ROOT_DIR/logs"
mkdir -p "$ROOT_DIR/backend"
mkdir -p "$ROOT_DIR/Ausgabe"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "$1" | tee -a "$LOG"; }

log "${GREEN}=== RealiMorph Setup (ComfyUI) ===${NC}"

# --- System-Pakete ---
log "${YELLOW}[1/6] Installiere System-Abhängigkeiten...${NC}"
sudo apt-get update -qq >> "$LOG" 2>&1
sudo apt-get install -y \
    python3.10 python3.10-venv python3.10-distutils \
    git wget curl \
    libgl1 libglib2.0-0 \
    nodejs \
    >> "$LOG" 2>&1 || { log "${RED}Fehler bei apt-get!${NC}"; exit 1; }
log "${GREEN}  ✓ System-Pakete installiert${NC}"

# --- Python 3.10 Venv ---
log "${YELLOW}[2/6] Erstelle Python 3.10 Virtual Environment...${NC}"
python3.10 -m venv "$VENV_DIR" >> "$LOG" 2>&1
source "$VENV_DIR/bin/activate"
pip install --upgrade pip >> "$LOG" 2>&1
log "${GREEN}  ✓ Python Venv bereit${NC}"

# --- rembg ---
log "${YELLOW}[3/6] Installiere rembg (Hintergrund-Entfernung)...${NC}"
pip install rembg onnxruntime pillow >> "$LOG" 2>&1
log "${GREEN}  ✓ rembg installiert${NC}"

# --- ComfyUI ---
log "${YELLOW}[4/6] Klone ComfyUI...${NC}"
if [ ! -d "$COMFY_DIR" ]; then
    git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFY_DIR" >> "$LOG" 2>&1
fi
cd "$COMFY_DIR"
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu >> "$LOG" 2>&1
pip install -r requirements.txt >> "$LOG" 2>&1

# ComfyUI-Manager installieren (einfachere Modellverwaltung)
if [ ! -d "$COMFY_DIR/custom_nodes/ComfyUI-Manager" ]; then
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git \
        "$COMFY_DIR/custom_nodes/ComfyUI-Manager" >> "$LOG" 2>&1
fi
log "${GREEN}  ✓ ComfyUI installiert${NC}"

# --- Modelle herunterladen ---
log "${YELLOW}[5/6] Lade Modelle herunter...${NC}"
mkdir -p "$MODELS_DIR" "$CONTROLNET_DIR" "$UPSCALE_DIR"

# epiCRealism
EPICREALISM_FILE="$MODELS_DIR/epicrealism_naturalSinRC1VAE.safetensors"
if [ ! -f "$EPICREALISM_FILE" ]; then
    log "  Lade epiCRealism..."
    wget -q --show-progress \
        -O "$EPICREALISM_FILE" \
        "https://huggingface.co/emilianJR/epiCRealism/resolve/main/epicrealism_naturalSinRC1VAE.safetensors" \
        >> "$LOG" 2>&1
fi

# ControlNet Canny
CANNY_FILE="$CONTROLNET_DIR/control_v11p_sd15_canny.safetensors"
if [ ! -f "$CANNY_FILE" ]; then
    log "  Lade ControlNet Canny..."
    wget -q --show-progress \
        -O "$CANNY_FILE" \
        "https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.safetensors" \
        >> "$LOG" 2>&1
fi

# ESRGAN Upscaler
ESRGAN_FILE="$UPSCALE_DIR/RealESRGAN_x4plus.pth"
if [ ! -f "$ESRGAN_FILE" ]; then
    log "  Lade ESRGAN 4x..."
    wget -q --show-progress \
        -O "$ESRGAN_FILE" \
        "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth" \
        >> "$LOG" 2>&1
fi

log "${GREEN}  ✓ Alle Modelle geladen${NC}"

# --- Electron App ---
log "${YELLOW}[6/6] Installiere Electron App...${NC}"
cd "$ELECTRON_DIR"
npm install >> "$LOG" 2>&1
log "${GREEN}  ✓ Electron App bereit${NC}"

log ""
log "${GREEN}╔══════════════════════════════════╗${NC}"
log "${GREEN}║  Setup abgeschlossen! ✓           ║${NC}"
log "${GREEN}╚══════════════════════════════════╝${NC}"
log "  Starte mit: ${YELLOW}./start.sh${NC}"
