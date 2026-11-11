"""Use the same validated catalog identities as the Node build, without a second parser."""
import json, subprocess
from pathlib import Path

def corpus(root, review=False):
    command=['node',str(Path(__file__).with_name('reading-corpus.cjs')),str(root)]
    if review: command.append('--review')
    return json.loads(subprocess.check_output(command,text=True))
