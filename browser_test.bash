#!/bin/bash

# Get the first argument which is a string, that should be inserted into the roomCode
roomCode=$1

# Array of 4 names to be inserted into the room
names=("Tedy" "Medy" "Nedy" "Ledy")

# The base URL to be opened
base_url="http://localhost:5173/play?roomCode=$roomCode&name="

# Function to open the URL with librewolf
open_url() {
	local name=$1
	local full_url="${base_url}${name}"
	librewolf "$full_url"
}

export -f open_url
export base_url

# Open the URLs in parallel
parallel open_url ::: "${names[@]}"
