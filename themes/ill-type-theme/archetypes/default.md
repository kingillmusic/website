+++
title = '{{ replace .File.ContentBaseName "-" " " | title | lower }}'

date = {{ .Date }}

audio = ['/mp3/{{ replace .File.ContentBaseName "-" " " | title | lower }}/{{ replace .File.ContentBaseName "-" " " | title | lower }}.opus']

tags = ['']

variants = ["35k", "250k", "1m", "4m", "16m"]

key = ''

bpm= ''
+++
