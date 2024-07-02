const
    so = document.querySelector("#SingleAudio"),
    ba = document.querySelector("#Five"),
    pp = document.querySelector("#PlayerPlay"),
    fo = document.querySelector("#Fifteen");

const pause = () => { so.pause(), pp.src = "/play.svg" };
    play = () => { so.play(), pp.src = "/pause.svg" };

ba.addEventListener("click", () => { so.currentTime -= 5 }),
pp.addEventListener("click", () => { so.paused ? play() : pause() }),
fo.addEventListener("click", () => { so.currentTime += 15 }),
so.addEventListener("ended", () => { so.currentTime = 0 });
