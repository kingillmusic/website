+++
title = '{{ replace .File.ContentBaseName "-" " " | title | lower }}'

date = {{ .Date }}

draft = false

url = '/{{ replace .File.ContentBaseName "-" " " | title | lower }}'

audio = ['/mp3/{{ replace .File.ContentBaseName "-" " " | title | lower }}/{{ replace .File.ContentBaseName "-" " " | title | lower }}.opus']

tags = ['']

type = 'products'

sku = ""

variants = ["50k", "250k", "1m", "4m", "16m"]
+++
