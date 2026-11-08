import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const { author, date, time, timezone, datetime } = lines[0];
      const ret = {
        id: commit,
        url: 'https://github.com/HitarthSS/DSC106-Portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', { value: lines });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const fileLengths = d3.rollups(
    data,
    (lines) => d3.max(lines, (d) => d.line),
    (d) => d.file,
  );

  const stats = [
    ['Total <abbr title="Lines of code">LOC</abbr>', data.length],
    ['Total commits', commits.length],
    ['Number of files', fileLengths.length],
    ['Longest file (lines)', d3.max(fileLengths, ([, length]) => length)],
    ['Average line length', d3.mean(data, (d) => d.length).toFixed(1)],
    ['Maximum depth', d3.max(data, (d) => d.depth)],
  ];

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  for (const [label, value] of stats) {
    const stat = dl.append('div');
    stat.append('dt').html(label);
    stat.append('dd').text(value);
  }
}

function renderTooltipContent(commit) {
  if (Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  link.href = commit.url;
  link.textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleString('en', {
    dateStyle: 'full',
  });
  document.getElementById('commit-time').textContent = commit.datetime.toLocaleString('en', {
    timeStyle: 'short',
  });
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  const left = Math.min(event.clientX, document.documentElement.clientWidth - tooltip.offsetWidth);
  const top = event.clientY + tooltip.offsetHeight < window.innerHeight
    ? event.clientY + 1
    : Math.max(0, event.clientY - tooltip.offsetHeight - 1);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function createBrushSelector(svg, brushed) {
  svg.append('g').call(d3.brush().on('start brush end', brushed));
  svg.select('.dots').raise();
}

function renderSelectionCount(selectedCommits) {
  const count = selectedCommits.length;
  const label = count === 1 ? 'commit' : 'commits';
  document.getElementById('selection-count').textContent = `${count || 'No'} ${label} selected`;
}

function renderLanguageBreakdown(selectedCommits) {
  const lines = selectedCommits.flatMap((commit) => commit.lines);
  const breakdown = d3.rollup(lines, (group) => group.length, (line) => line.type);
  const format = d3.format('.1~%');
  const container = d3.select('#language-breakdown').html('');

  for (const [language, count] of breakdown) {
    const stat = container.append('div');
    stat.append('dt').text(language.toUpperCase());
    stat.append('dd').text(`${count} lines\n(${format(count / lines.length)})`);
  }
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const dots = svg.append('g').attr('class', 'dots');

  const circles = dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  createBrushSelector(svg, brushed);

  function brushed(event) {
    const selectedCommits = commits.filter((commit) => isCommitSelected(event.selection, commit));
    const selected = new Set(selectedCommits);
    circles.classed('selected', (commit) => selected.has(commit));
    renderSelectionCount(selectedCommits);
    renderLanguageBreakdown(selectedCommits);
  }

  function isCommitSelected(selection, commit) {
    if (!selection) return false;

    const [[left, top], [right, bottom]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= left && x <= right && y >= top && y <= bottom;
  }
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
