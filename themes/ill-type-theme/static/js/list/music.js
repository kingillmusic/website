const
	pAudio = document.getElementById("PlayerAudio"),
	go = document.getElementById("GotoTrack"),
	pr = document.getElementById("Previous"),
	pp = document.getElementById("PlayerPlay"),
	nx = document.getElementById("Next"),
	sb = document.getElementById("Shuffle"),
	rp = document.getElementById("Repeat"),
	row = Array.from(document.getElementsByClassName("row")),
	trp = Array.from(document.getElementsByClassName("TrackPlay")),
	tro = Array.from(document.getElementsByClassName("TrackAudio")),
	trt = Array.from(document.getElementsByClassName("TrackTitle"));

let sh = !1, rpb = !1, a = [], n = 0;

load = () => { trn = a[n], pAudio.src = tro[trn].src, go.innerHTML = trt[trn].innerHTML },

na = (e,t) => { for (t = []; e--;) t[e] = e; return t },

fy = (a,b,c,d) => { // minified fisher-yates shuffle algo.
    for (c = a.length; c;) b = Math.random()*c--|0, d = a[c], a[c] = a[b], a[b] = d },

(soa = () => {
    sh=!1,
        fy(a = na(tro.length)),
       	sb.style.background = "#97ffff",
		a.sort((x,y) => { return x - y });
        pAudio.paused ? load() : addEventListener("ended", load)
})(),

sha = () => {
    sh=!0,
        fy(a = na(tro.length)),
       	sb.style.background = "#eeeeee",
		pAudio.paused ? load() : addEventListener("ended", load)
},

rpt = () => {
    rpb = !0,
		pAudio.addEventListener("ended", () => { pAudio.currentTime = 0 }),
		rp.style.background = "#eeeeee",
        pAudio.addEventListener("ended", play)
},

drpt = () => { rpb = !1, rp.style.background = "#97ffff" },

window.onload = () => {
	const container = document.querySelector('main');

	container.addEventListener('click', e => {
		const track = e.target.closest('.Track');
		if (!track) return; // Ignore clicks outside .Track elements

		const t = track.querySelector('.TrackPlay');
		if (!t) return; // Safety check

		t.getAttribute('src') === '/svg/play.svg' ?
		(soa(), n = trp.indexOf(t), pause(), load(), play()) : pause();
	});
};

const pause = () => {
    for (let s = 0; s < row.length; s++)
        pAudio.pause(),
        pp.src = "/svg/play.svg",
		go.style.color = "#000",
		trp[s].src = "/svg/play.svg" 
},

next = () => {
    n < a.length - 1 ?
        (load(n++), pause(), play()) :
        (load(n=0), pause(), play()),
		row[trn].scrollIntoView({ behavior:"smooth" })
},

previous = () => {
    n > 0 ?
        (load(n--), pause(), play()) :
        (load(n = a.length-1), pause(), play()), 
		row[trn].scrollIntoView({ behavior:"smooth" })
},

play = () => {
    pAudio.play(),
    pp.src = "/svg/pause.svg",
	go.style.color = "#ff8d00",
    trp[trn].src = "/svg/stop.svg"
};

go.addEventListener("click", () => { row[trn].scrollIntoView({ behavior:"smooth" }) }),
pr.addEventListener("click", () => { sh ? previous() : n = trn, previous() }),
pp.addEventListener("click", () => { pAudio.paused ? play() : pause() }),
nx.addEventListener("click", () => { sh ? next() : (n = trn, next()) }),
sb.addEventListener("click", () => { sh ? soa() : sha() }),
rp.addEventListener("click", () => { rpb ? drpt() : rpt() }),
pAudio.addEventListener("ended", () => { rpb ? rpt() : next() });
