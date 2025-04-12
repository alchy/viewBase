// Tento soubor je Web Worker – kód běžící na pozadí, odděleně od hlavního programu.
// Slouží k načítání dat z internetu, aby hlavní program nezamrzl.

// "self" je globální objekt uvnitř workeru (podobné jako "window" v hlavním programu).
// "onmessage" nastavuje, co se stane, když worker dostane zprávu od hlavního programu.
self.onmessage = async function(event) {
    // "event" je objekt, který obsahuje zprávu od hlavního programu.
    // "event.data" jsou konkrétní data, která nám hlavní program poslal.
    const data = event.data; // Ukládáme si data do proměnné pro snadnější práci.

    // Kontrolujeme, jestli zpráva říká "fetch" (což znamená "načti data").
    if (data.type === 'fetch') {
        try {
            // Vytvoříme unikátní URL přidáním timestampu, aby se předešlo cachování.
            // Např. z "http://localhost:8080/nodes_test.json" uděláme
            // "http://localhost:8080/nodes_test.json?ts=1234567890".
            const timestamp = new Date().getTime(); // Získáme aktuální čas v milisekundách.
            const uniqueUrl = `${data.url}?ts=${timestamp}`; // Přidáme parametr ts k URL.

            // "fetch" načte data z unikátního URL, čímž zabráníme cachování.
            // "await" znamená: čekej, dokud se data nenačtou.
            const response = await fetch(uniqueUrl);

            // Převedeme odpověď (data) do formátu JSON, což je běžný formát pro data.
            // Zase čekáme ("await"), protože to chvíli trvá.
            const graphData = await response.json();

            // Posíláme zprávu zpět hlavnímu programu s načtenými daty.
            // "self.postMessage" je způsob, jak worker komunikuje s hlavním programem.
            self.postMessage({
                type: 'data',          // Říkáme, že posíláme načtená data.
                nodes: graphData.nodes, // Uzlíky (body) grafu.
                edges: graphData.edges || [] // Hrany grafu (spojení mezi body), nebo prázdné pole, pokud žádné nejsou.
            });
        } catch (error) {
            // Pokud něco selže (např. špatná URL nebo chyba sítě), zachytíme chybu.
            // Posíláme zprávu o chybě zpět hlavnímu programu.
            self.postMessage({
                type: 'error',        // Říkáme, že došlo k chybě.
                error: error.message  // Popis chyby (např. "Network error").
            });
        }
    }
};