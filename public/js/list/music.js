const
    po = document.querySelector("#PlayerAudio"),
    go = document.querySelector("#GotoTrack"),
    ba = document.querySelector("#Seek5"),
    pr = document.querySelector("#Previous"),
    pp = document.querySelector("#PlayerPlay"),
    nx = document.querySelector("#Next"),
    fo = document.querySelector("#Seek15"),
    sb = document.querySelector("#Shuffle"),
    rp = document.querySelector("#Repeat"),
    row = Array.from(document.querySelectorAll(".row")),
    trp = Array.from(document.querySelectorAll(".TrackPlay")),
    tro = Array.from(document.querySelectorAll(".TrackAudio")),
    trt = Array.from(document.querySelectorAll(".TrackTitle"));

let sh = !1, rpb = !1, a = [], n = 0;

load = () => { trn = a[n], po.src = tro[trn].src, go.innerHTML = trt[trn].innerHTML },

na = (e,t) => { for (t = []; e--;) t[e] = e; return t },
fy = (a,b,c,d) => { // minified fisher-yates shuffle algo.
    for (c = a.length; c;) b = Math.random()*c--|0, d = a[c], a[c] = a[b], a[b] = d },

(soa = () => {
    sh=!1,
        fy(a = na(tro.length)),
       	sb.style.border = "none",
        a.sort((x,y) => { return x - y });
        po.paused ? load() : addEventListener("ended", load) })(),

sha = () => {
    sh=!0,
        fy(a = na(tro.length)),
       	sb.style.border = "2px dotted #87ffff",
        po.paused ? load() : addEventListener("ended", load) },

rpt = () => {
    rpb = !0,
		po.addEventListener("ended", () => { po.currentTime = 0 }),
       	rp.style.border = "2px dotted #87ffff",
        po.addEventListener("ended", play) },

drpt = () => { rpb = !1, rp.style.border = "none" },

window.onload = r => {
	row.forEach (r => {
		let t = r.querySelector(".TrackPlay");
    	r.querySelector(".Track").addEventListener("click", () => {
        	t.getAttribute("src") === "/play.svg" ?
            (soa(), n = trp.indexOf(t), pause(), load(), play()) : pause() }) }) };

const pause = () => {
    for (let e = 0; e < row.length; e++)
        tro[e].pause(), trp[e].src = "/play.svg",
        po.pause(), pp.src = "/play.svg" },

next = () => {
    n < a.length - 1 ?
        (load(n++), pause(), play()) :
        (load(n=0), pause(), play()) },

previous = () => {
    n > 0 ?
        (load(n--), pause(), play()) :
        (load(n = a.length-1), pause(), play()) },

play = () => {
    po.play(),
	pp.src = "/pause.svg",
    trp[trn].src = "/stop.svg" };

go.addEventListener("click", () => { row[trn].scrollIntoView({ behavior:"smooth" }) }),
ba.addEventListener("click", () => { po.currentTime -= 5 }),
pr.addEventListener("click", () => { sh ? previous() : n = trn, previous() }),
pp.addEventListener("click", () => { po.paused ? play() : pause() }),
nx.addEventListener("click", () => { sh ? next() : (n = trn, next()) }),
fo.addEventListener("click", () => { po.currentTime += 15 }),
sb.addEventListener("click", () => { sh ? soa() : sha() }),
rp.addEventListener("click", () => { rpb ? drpt() : rpt() }),
po.addEventListener("ended", () => { rpb ? rpt() : next() });
