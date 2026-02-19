#!/bin/bash
echo "Building and restarting services..."
docker compose build backend
docker compose restart backend
echo "Backend restarted!"
