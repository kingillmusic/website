+++
title = '{{ replace .File.ContentBaseName "-" " " | title | lower }}'

date = {{ .Date }}

draft = false

url = '/{{ replace .File.ContentBaseName "-" " " | title | lower }}'

audio = ['/mp3/{{ replace .File.ContentBaseName "-" " " | title | lower }}/{{ replace .File.ContentBaseName "-" " " | title | lower }}.mp3']

tags = ['']

type = 'products'

productID = '000'

variant_type = 'package'
[[variants]]
name = '50k streams'
sku = '{{ index (seq 1000 | shuffle) 0 }}'
price = '35'
[[variants]]
name = '250k streams'
sku = '{{ index (seq 1000 | shuffle) 0 }}'
price = '100'
[[variants]]
name = '1m streams'
sku = '{{ index (seq 1000 | shuffle) 0 }}'
price = '200'
[[variants]]
name = '4m streams'
sku = '{{ index (seq 1000 | shuffle) 0 }}'
price = '600'
[[variants]]
name = '16m streams'
sku = '{{ index (seq 1000 | shuffle) 0 }}'
price = '2000'
+++
