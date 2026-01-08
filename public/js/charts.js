// Chart.js initialization and premium styling configuration
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748b';
Chart.defaults.font.weight = '600';

document.addEventListener('DOMContentLoaded', function () {
    // Total Orders Chart
    fetch('/api/owner/stats/total-orders')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('totalOrdersChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Confirmed', 'Leads'],
                        datasets: [{
                            data: [data.ordered, data.notOrdered],
                            backgroundColor: [
                                '#6366f1', // Indigo 500
                                '#e2e8f0'  // Slate 200
                            ],
                            hoverBackgroundColor: [
                                '#4f46e5',
                                '#cbd5e1'
                            ],
                            borderWidth: 0,
                            cutout: '75%'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    font: { size: 12 }
                                }
                            },
                            title: {
                                display: false
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching total orders:', error));

    // Total Sales Chart
    fetch('/api/owner/stats/total-sales')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('totalSalesChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Orders', 'SKUs Moved'],
                        datasets: [{
                            label: 'Metrics',
                            data: [data.totalOrders, data.totalProducts],
                            backgroundColor: [
                                'rgba(139, 92, 246, 0.8)', // Purple 500
                                'rgba(236, 72, 153, 0.8)'  // Pink 500
                            ],
                            borderRadius: 12,
                            barThickness: 40
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { display: false },
                                ticks: { stepSize: 1 }
                            },
                            x: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching total sales:', error));

    // Salesperson Sales Chart
    fetch('/api/owner/stats/salesperson-sales')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('salespersonSalesChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(item => item.name),
                        datasets: [{
                            label: 'Volume',
                            data: data.map(item => item.totalOrders),
                            backgroundColor: '#10b981', // Emerald 500
                            borderRadius: 8,
                            barThickness: 24
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: false }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: { display: false },
                                ticks: { stepSize: 1 }
                            },
                            y: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching salesperson sales:', error));

    // Date-wise Sales Chart
    fetch('/api/owner/stats/date-wise-sales')
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('dateWiseSalesChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.map(item => {
                            const date = new Date(item._id);
                            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                        }),
                        datasets: [{
                            label: 'Activity',
                            data: data.map(item => item.totalOrders),
                            borderColor: '#ef4444', // Red 500
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            borderWidth: 4,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#ef4444',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            title: { display: false }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: '#f1f5f9' },
                                ticks: { stepSize: 1 }
                            },
                            x: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching date-wise sales:', error));
});

