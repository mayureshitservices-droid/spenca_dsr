// GPS Capture Functionality
let gpsData = {
    latitude: null,
    longitude: null,
    accuracy: null,
    captured: false
};

function captureGPS() {
    const gpsBtn = document.getElementById('gpsBtn');
    const gpsInfo = document.getElementById('gpsInfo');
    const gpsStatus = document.getElementById('gpsStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (!navigator.geolocation) {
        alert('Action Blocked: Geolocation is not supported by your current browser.');
        return;
    }

    // Show loading state
    gpsBtn.disabled = true;
    gpsBtn.innerHTML = `
        <div class="flex items-center gap-3">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Synchronizing...
        </div>`;

    gpsStatus.innerHTML = '<i class="bi bi-broadcast"></i> Establishing satellite connection...';
    gpsStatus.className = 'p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl text-indigo-800 font-black text-center animate-pulse';
    gpsInfo.classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(
        function (position) {
            // Success
            gpsData.latitude = position.coords.latitude;
            gpsData.longitude = position.coords.longitude;
            gpsData.accuracy = position.coords.accuracy;
            gpsData.captured = true;

            // Update hidden form fields
            document.getElementById('latitude').value = gpsData.latitude;
            document.getElementById('longitude').value = gpsData.longitude;
            document.getElementById('accuracy').value = gpsData.accuracy;

            // Update UI
            gpsBtn.innerHTML = '<i class="bi bi-shield-fill-check text-2xl"></i> Signal Locked';
            gpsBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
            gpsBtn.classList.add('bg-white', 'text-emerald-600', 'border-2', 'border-emerald-600', 'shadow-none');

            gpsStatus.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <div class="flex items-center gap-2 text-emerald-700">
                        <i class="bi bi-check-circle-fill text-xl"></i>
                        <span class="uppercase tracking-widest text-xs font-black">Authentication Successful</span>
                    </div>
                    <div class="grid grid-cols-3 gap-4 w-full mt-4 pt-4 border-t border-emerald-100">
                        <div class="text-center">
                            <div class="text-[9px] text-emerald-600/50 uppercase font-black">Latitude</div>
                            <div class="text-sm font-black text-emerald-800">${gpsData.latitude.toFixed(6)}</div>
                        </div>
                        <div class="text-center border-x border-emerald-100 px-4">
                            <div class="text-[9px] text-emerald-600/50 uppercase font-black">Longitude</div>
                            <div class="text-sm font-black text-emerald-800">${gpsData.longitude.toFixed(6)}</div>
                        </div>
                        <div class="text-center">
                            <div class="text-[9px] text-emerald-600/50 uppercase font-black">Radius</div>
                            <div class="text-sm font-black text-emerald-800">${gpsData.accuracy.toFixed(1)}m</div>
                        </div>
                    </div>
                </div>
            `;
            gpsStatus.className = 'p-8 bg-emerald-50 border-2 border-emerald-100 rounded-3xl text-emerald-800 font-bold text-center animate-in zoom-in duration-500';

            // Enable submit button
            submitBtn.disabled = false;
        },
        function (error) {
            // Error
            let errorMessage = 'Failed to capture GPS location';

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Satellite link denied. Please check location permissions.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Coordinate signal lost. Please move to an open area.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Authentication timed out. Retrying recommended.';
                    break;
            }

            gpsStatus.innerHTML = `<i class="bi bi-exclamation-octagon-fill text-xl block mb-2"></i> ${errorMessage}`;
            gpsStatus.className = 'p-6 bg-red-50 border-2 border-red-100 rounded-3xl text-red-700 font-black text-center active:scale-95 cursor-pointer';

            gpsBtn.disabled = false;
            gpsBtn.innerHTML = '<i class="bi bi-pin-map text-2xl"></i> Retry GPS Capture';
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Prevent form submission without GPS
document.addEventListener('DOMContentLoaded', function () {
    const orderForm = document.getElementById('orderForm');

    if (orderForm) {
        orderForm.addEventListener('submit', function (e) {
            if (!gpsData.captured) {
                e.preventDefault();
                alert('Verification Required: You must capture a live GPS signal at the client site before synchronization.');
                return false;
            }
        });
    }
});

