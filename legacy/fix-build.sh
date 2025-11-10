#!/bin/bash
# Quick fix: Comment out CreateRoomSheet usage temporarily to get build working

cd ~/Desktop/Sinapse/frontend/iOS

# Backup
cp Views/RoomListView.swift Views/RoomListView.swift.bak

# Comment out CreateRoomSheet usage
sed -i '' 's/CreateRoomSheet(/\/\/ CreateRoomSheet(/g' Views/RoomListView.swift
sed -i '' 's/showCreateSheet = true/\/\/ showCreateSheet = true/g' Views/RoomListView.swift

echo "✅ Temporarily commented out CreateRoomSheet"
echo "Build should work now. Add CreateRoomSheet.swift to Xcode project target manually."


