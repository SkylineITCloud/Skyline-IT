@echo off
cd /d "%~dp0"
echo Mzansi Connect - Women's Safety Preview
echo Open http://127.0.0.1:8790/ after the server starts.
echo Development only. Notifications are simulated. Ctrl+C stops the preview.
python "Product\Livestock tracker\server\safety\preview.py" --port 8790
pause
