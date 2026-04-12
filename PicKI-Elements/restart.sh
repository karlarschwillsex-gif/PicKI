#!/bin/bash
SCRIPT_DIR="/media/fynn/Intel-1TB-Intern/.PicKI-Elements"
echo "Starte PicKI-Elements neu..."
bash "$SCRIPT_DIR/stop.sh"
sleep 3
bash "$SCRIPT_DIR/start.sh"
