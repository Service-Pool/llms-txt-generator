#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR"

# Creating a user-writable npm prefix for global installs
npm list -g --depth=0 > ~/npm-global-packages.txt
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Claude Code install
npm install -g @anthropic-ai/claude-code

# Start supervisord
exec /usr/bin/supervisord -c /etc/supervisord.conf
