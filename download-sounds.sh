#!/bin/bash

# Create the sounds directory if it doesn't exist
mkdir -p public/sounds

# Download free sound effects from GitHub
echo "Downloading sound effects..."

# Laser sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/laser5.mp3" -o public/sounds/laser-shoot.mp3

# Explosion sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/drag.mp3" -o public/sounds/explosion.mp3

# Jump sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/button-15.mp3" -o public/sounds/jump.mp3

# Game over sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/ultrasound.mp3" -o public/sounds/game-over.mp3

# Level up sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/fancy-beep.mp3" -o public/sounds/level-up.mp3

# Reload sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/switch2.mp3" -o public/sounds/reload.mp3

# Hit sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/button-10.mp3" -o public/sounds/hit.mp3

# Empty gun sound
curl -L "https://github.com/scottschiller/SoundManager2/raw/master/demo/mp3/click-low.mp3" -o public/sounds/empty.mp3

echo "All sound files downloaded to public/sounds/"
echo "Make sure to review and potentially replace these placeholder sounds with your own."
