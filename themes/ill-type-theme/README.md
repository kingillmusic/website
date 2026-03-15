# ill x eezyh official hugo theme

"ill type theme" is intended to be an an extremely minimal yet fully featured Hugo theme for putting your music on display and accepting donations. I currently use it for my personal website, [kingillmusic.com](https://kingillmusic.com).

## get started

```sh
hugo new site new-site
cd new-site
git clone https://github.com/kingillmusic/ill-type-theme themes/
echo "theme = 'ill-type-theme'" >> hugo.toml
```

## features

- `titlebar.html` or header, clickable song title that scrolls down to song location in the tracklist.
- share button that copies song link, positioned next to song title and includes artist name (i.e. x eezyh), displays pop up with links.
- `tagcloud.html` tags displayed at the top of the page, automatically get removed or added based on your tag variable in content/beats/*.md.
- `search.html` search bar.
- `tracks.html` all content added to static/mp3 automatically show up, no need to touch it unless you want to change the play button svg.
- `taglist.html` displays tags next to track title.
- `player.html` music player with next, previous, repeat and shuffle options.

## TODO

- Pretty much done. Most of it taken from hugocodex.org/add-ons/webshop/ but needed editing to fit beat market style cart and shopping.
