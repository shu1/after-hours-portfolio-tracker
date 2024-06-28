// Shuichi Aizawa 2024
"use strict";

pre_button.onclick = () => shusFinanceTools(0);
post_button.onclick = () => shusFinanceTools(1);
range_button.onclick = () => shusFinanceTools(2);

function shusFinanceTools(mode) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, ([tab]) => {
    if (tab.url.startsWith("https://finance.yahoo.com/portfolio/")) {
      chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: contentScript,
          args: [mode],
        }).then(([res]) => {
          if (res.result) {
            pre_post.innerHTML = res.result[0];
            change_sum.innerHTML = "$" + res.result[1];
            chrome.action.setBadgeText({ text: res.result[2].toFixed(1) + "%" });
            chrome.action.setTitle({ title: res.result[0] + "-Mkt Chg Sum: $" + res.result[1] });
          }
        });
    }
  });
}

function contentScript(mode) {
  function format(n) {
    return n ? Number(n.toFixed(2)) : 0;
  }

  const stockTable = document.querySelector("#pf-detail-table");
  if (mode <= 1) {
    const stockList = stockTable.querySelectorAll(".Fz\\(s\\)[data-field=regularMarketPrice][data-trend=none]");

    const p = ["Pre", "Post"];
    let portfolioSum, changeSum, changeTable;
    function scrapeTable() {
      portfolioSum = 0;
      changeSum = 0;
      changeTable = {};
      stockList.forEach((stock) => {
        const marketValue = Number(stock.getAttribute("value"));
        portfolioSum += marketValue;

        let changePercent = stockTable.querySelector(`[data-field=${mode ? "post" : "pre"}MarketChangePercent][data-symbol=${stock.dataset.symbol}]`);
        changePercent = Number(changePercent?.getAttribute("value"));
        const changeValue = marketValue * changePercent / 100;
        changeSum += changePercent ? changeValue : 0;

        changeTable[stock.dataset.symbol] = {
          "Market Value": format(marketValue),
          [p[mode] + "-Mkt Chg %"]: format(changePercent),
          [p[mode] + "-Mkt Chg Val"]: format(changeValue),
        };
      });
    }
    scrapeTable();
    if (!changeSum) {
      mode = 1 - mode;
      scrapeTable();
    }
    if (!changeSum) return;

    console.table(changeTable);
    const sumPercent = format(changeSum / portfolioSum * 100);
    console.log(`${p[mode]}-Mkt Chg Sum: $${format(changeSum)}, ${sumPercent}%`);
    return [p[mode], format(changeSum), sumPercent];
  }
  else if (mode == 2) {
    const prices = stockTable.querySelectorAll("[data-field=regularMarketPrice][data-trend=none]");
    const highs = stockTable.querySelectorAll("[aria-label='52-Wk High']");
    const lows = stockTable.querySelectorAll("[aria-label='52-Wk Low']");

    const rangeArray = [];
    for (let i = 0; i < prices.length; ++i) {
      const price = Number(prices[i].getAttribute("value"));
      const high = Number(highs[i].innerText.replace(/,/g, ""));
      const low = Number(lows[i].innerText.replace(/,/g, ""));
      rangeArray.push({
        index: i,
        symbol: prices[i].dataset.symbol,
        percentage: (price - low) / (high - low),
      });
    }
    rangeArray.sort((a, b) => a.percentage - b.percentage);

    const rangeTable = {};
    for (let i = 0; i < rangeArray.length; ++i) {
      rangeTable[rangeArray[i].symbol] = {
        change: i - rangeArray[i].index,
        "52-Wk percentage": format(rangeArray[i].percentage * 100),
      };
    }
    console.table(rangeTable);
  }
}
