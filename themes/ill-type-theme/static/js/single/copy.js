email = () => {
    const
    ce = document.querySelector("#CopiedEmail"),
    em = document.querySelector("#email");
    navigator.clipboard.writeText(em.value);
    ce.style.display = "block";
    setTimeout( () => { ce.style.display = "none" }, 1000); };

cbtc = () => {
    const
    cbc = document.querySelector("#CopiedBTC"),
	btc = document.querySelector("#btc");
    navigator.clipboard.writeText(btc.value);
    cbc.style.display = "block";
    setTimeout( () => { cbc.style.display = "none" }, 1000); };

cxmr = () => {
    const
    cxc = document.querySelector("#CopiedXMR"),
	xmr = document.querySelector("#xmr");
    navigator.clipboard.writeText(xmr.value);
    cxc.style.display = "block";
    setTimeout( () => { cxc.style.display = "none" }, 1000); };

cppl = () => {
    const
    cpc = document.querySelector("#CopiedPPL"),
    ppl = document.querySelector("#ppl");
    navigator.clipboard.writeText(ppl.value);
    cpc.style.display = "block";
    setTimeout( () => { cpc.style.display = "none" }, 1000); };
