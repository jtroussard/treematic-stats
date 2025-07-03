// dashboard.js

let filledData = []; // Filled install data shared across modules

// Fill in missing days in the dataset (used only for install data)
function fillMissingDates(data) {
    const filled = [];
    const dateToInstalls = Object.fromEntries(data.map(e => [e.date, e.installs]));
    const start = new Date(data[0].date);
    const end = new Date(data[data.length - 1].date);
    let current = new Date(start);
    let lastKnown = data[0].installs;

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (dateToInstalls[dateStr] !== undefined) {
            lastKnown = dateToInstalls[dateStr];
        }
        filled.push({ date: dateStr, installs: lastKnown });
        current.setDate(current.getDate() + 1);
    }

    return filled;
}

// Fetch and process the data.json file
fetch('https://raw.githubusercontent.com/jtroussard/treematic-stats/main/data.json')
    .then(response => response.json())
    .then(data => {
        if (!data || !Array.isArray(data)) throw new Error("Invalid data format.");

        filledData = fillMissingDates(data);

        const labels = filledData.map(entry => entry.date);
        const installs = filledData.map(entry => entry.installs);
        const dailyChanges = installs.map((val, i, arr) => i === 0 ? 0 : val - arr[i - 1]);

        // Populate KPIs
        document.getElementById('totalInstalls').textContent = installs[installs.length - 1];
        document.getElementById('firstDate').textContent = labels[0];
        document.getElementById('lastDate').textContent = labels[labels.length - 1];

        const avgDelta = (
            dailyChanges.reduce((sum, val) => sum + val, 0) / dailyChanges.length
        ).toFixed(1);

        document.getElementById('avgDelta').textContent = avgDelta;

        // Most recent delta value
        const mostRecentDelta = dailyChanges[dailyChanges.length - 1];
        document.getElementById('maxDelta4').textContent = mostRecentDelta > 0 ? mostRecentDelta : '—';


        // Filter deltas: ignore if the 7 days before had all 0s
        const validDeltas = [];

        for (let i = 7; i < dailyChanges.length; i++) {
            const delta = dailyChanges[i];

            // Skip non-positive changes
            if (delta <= 0) continue;

            const pastWeek = dailyChanges.slice(i - 7, i);
            const allZeros = pastWeek.every(val => val === 0);

            if (!allZeros && !validDeltas.some(entry => entry.delta === delta)) {
                validDeltas.push({ delta, index: i });
            }
        }

        // Sort by delta descending
        validDeltas.sort((a, b) => b.delta - a.delta);

        // Apply to DOM
        document.getElementById('maxDelta1').textContent = validDeltas[0]?.delta ?? '—';
        document.getElementById('maxDelta2').textContent = validDeltas[1]?.delta ?? '—';
        document.getElementById('maxDelta3').textContent = validDeltas[2]?.delta ?? '—';

        const format = (entry) => filledData[entry.index]?.date ?? 'N/A';
        console.log('Top Install Dates:', format(validDeltas[0]), format(validDeltas[1]), format(validDeltas[2]));

        // Populate table (omit 0-delta rows)
        const tableBody = document.getElementById('dataTable');
        filledData.forEach((entry, i) => {
            const delta = i === 0 ? 0 : installs[i] - installs[i - 1];
            if (delta === 0) return; // Skip no-change days

            const row = document.createElement('tr');
            row.innerHTML = `
        <td>${entry.date}</td>
        <td>${entry.installs}</td>
        <td>${delta}</td>
    `;
            tableBody.appendChild(row);
        });

        // Render line chart
        const ctx = document.getElementById('installChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Installs',
                    data: installs,
                    borderColor: 'blue',
                    backgroundColor: 'rgba(0, 0, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true,
                    pointRadius: 0, // hide dots
                    pointHoverRadius: 4 // optional hover interactivity
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 800,
                    easing: 'easeOutQuart'
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month'
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Installs'
                        },
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            title: (tooltipItems) => {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                }); // → "Jul 3, 2025"
                            }
                        }
                    }
                }
            }
        });

        // Fetch and process release.json after data is loaded
        loadAndRenderReleaseChart();

    })
    .catch(err => console.error("Data loading error:", err));

// Load and process release.json
function loadAndRenderReleaseChart() {
    fetch('https://raw.githubusercontent.com/jtroussard/treematic-stats/main/releases.json')
        .then(resp => resp.json())
        .then(releases => {
            if (!Array.isArray(releases)) throw new Error("Invalid release data");

            releases.sort((a, b) => new Date(a.date) - new Date(b.date));

            const versionBuckets = {};
            let currentIdx = 0;

            for (let i = 0; i < releases.length; i++) {
                const releaseDate = new Date(releases[i].date);
                const nextDate = releases[i + 1] ? new Date(releases[i + 1].date) : null;
                const version = releases[i].version;

                let installSum = 0;
                while (currentIdx < filledData.length) {
                    const entryDate = new Date(filledData[currentIdx].date);
                    if (entryDate < releaseDate) {
                        currentIdx++;
                        continue;
                    }
                    if (nextDate && entryDate >= nextDate) break;

                    const delta = currentIdx === 0
                        ? 0
                        : filledData[currentIdx].installs - filledData[currentIdx - 1].installs;

                    installSum += delta;
                    currentIdx++;
                }
                versionBuckets[version] = (versionBuckets[version] || 0) + installSum;
            }

            // Group small contributors under "Other"
            const entries = Object.entries(versionBuckets);
            const total = entries.reduce((sum, [, val]) => sum + val, 0);
            const grouped = {};
            let otherSum = 0;

            for (const [version, count] of entries) {
                const percent = count / total;
                if (percent < 0.02) {
                    otherSum += count;
                } else {
                    grouped[version] = count;
                }
            }
            if (otherSum > 0) grouped["Other"] = otherSum;

            // Precompute averages per day while building versionBuckets
            const versionAveragesMap = {};  // version => avg/day

            for (let i = 0; i < releases.length; i++) {
                const version = releases[i].version;
                const startDate = new Date(releases[i].date);
                const endDate = releases[i + 1]
                    ? new Date(releases[i + 1].date)
                    : new Date(filledData[filledData.length - 1].date);

                const daysActive = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                const totalInstalls = versionBuckets[version] || 0;
                versionAveragesMap[version] = +(totalInstalls / daysActive).toFixed(2);
            }

            // Render Pie Chart
            const pieCtx = document.getElementById('releasePieChart').getContext('2d');
            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(grouped),
                    datasets: [{
                        label: 'Installs by Release',
                        data: Object.values(grouped),
                        backgroundColor: [
                            '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
                            '#20c997', '#fd7e14', '#6610f2', '#e83e8c', '#17a2b8',
                            '#343a40'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const version = context.label;
                                    const count = context.raw;
                                    const totalForPie = Object.values(grouped).reduce((sum, val) => sum + val, 0);
                                    const pct = ((count / totalForPie) * 100).toFixed(1);
                                    const avg = versionAveragesMap[version] || 0;

                                    return [
                                        `  ${count} installs (${pct}%)`,
                                        `  Avg: ${avg} installs/day`
                                    ];
                                }
                            }
                        }

                    }
                }
            });
        })
        .catch(err => console.error("Error loading releases.json:", err));
}
