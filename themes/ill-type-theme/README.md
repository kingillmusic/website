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

- title bar with clickable song title that scrolls down to song location.
- share button that copies song link.
- tag menu which i used to display the list of genres available at the top of the page.
- search bar.
- `taglist.html` displays track genre next to it's title.
- music player with next and previous buttons as well as repeat and shuffle options.
- separate music players for list and singles with the appropriate features for each.
- single page includes buttons that copy crypto or paypal link for donation purposes.
- `nextprev.html` adds links to the next and previous tracks to the bottom of a page.

## TODO

- set up store and payment systems - all progress made is included in theme.
