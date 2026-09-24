import { afterEach, expect, it, vi } from 'vite-plus/test';
import { locateForAttendance } from './geolocation';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

function gps() {
    let callback: PositionCallback;
    let failure: PositionErrorCallback;
    const clearWatch = vi.fn();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('navigator', {
        geolocation: {
            watchPosition: vi.fn(
                (success: PositionCallback, error: PositionErrorCallback) => {
                    callback = success;
                    failure = error;
                    return 7;
                },
            ),
            clearWatch,
        },
    });
    return {
        clearWatch,
        emit: (accuracy: number) =>
            callback({
                coords: { latitude: -0.91, longitude: 100.46, accuracy },
            } as GeolocationPosition),
        deny: () => failure({ code: 1 } as GeolocationPositionError),
    };
}

it('waits for coarse GPS to improve and accepts the selected radius rather than a fixed fifty meters', async () => {
    vi.useFakeTimers();
    const device = gps();
    const result = locateForAttendance(100);
    device.emit(600);
    expect(device.clearWatch).not.toHaveBeenCalled();
    device.emit(80);
    expect(await result).toEqual({
        latitude: -0.91,
        longitude: 100.46,
        accuracy_meters: 80,
    });
    expect(device.clearWatch).toHaveBeenCalledWith(7);
});

it('returns the best actual accuracy at timeout without replacing it with a passing value', async () => {
    vi.useFakeTimers();
    const device = gps();
    const result = locateForAttendance(100);
    device.emit(900);
    device.emit(400);
    device.emit(700);
    await vi.advanceTimersByTimeAsync(12000);
    expect((await result).accuracy_meters).toBe(400);
    expect(device.clearWatch).toHaveBeenCalledWith(7);
});

it('reports denied permission and clears the location watcher', async () => {
    const device = gps();
    const result = locateForAttendance(100);
    device.deny();
    await expect(result).rejects.toThrow('Izin lokasi ditolak');
    expect(device.clearWatch).toHaveBeenCalledWith(7);
});
