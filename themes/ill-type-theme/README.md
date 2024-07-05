# ill x eezyh official hugo theme

"ill type theme" is intended to be an an extremely minimal yet fully featured Hugo theme for putting your music on display and accepting donations. I currently use it for my personal website, [kingillmusic.com](https://kingillmusic.com).

## get started

```sh
hugo new site new-site
cd new-site
git clone https://github.com/kingillmusic/ill-type-theme themes/lugo
echo "theme = 'ill-type-theme'" >> hugo.toml
```

## features

- `titlebar.html` clickable song title that scrolls down to song location in the tracklist.
- share button that copies song link, positioned in the title bar.
- `tagcloud.html` is the tag menu displayed at the top of the page.
- `search.html` search bar.
- `taglist.html` displays tags next to track title.
- `player.html` music player with next, previous, repeat and shuffle options.
- `splayer.html` separate music players single tracks with the less features.
- `donate.html` single track page includes buttons that copy donation info.
- `nextprev.html` adds links to the next and previous tracks to the bottom of a page.

## TODO

- Pretty much done. Most of it taken from hugocodex.org/add-ons/webshop/ but needed editing to fit beat market style cart and shopping. All progress made is included in theme.
