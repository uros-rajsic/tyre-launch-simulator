@echo off
cd /d "%~dp0"
start "" http://localhost:4174/
python -m http.server 4174
