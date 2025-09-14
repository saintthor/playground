/**
 * Timer Class - Time Manager
 * 
 * Responsible for tick counting, time control, and the time base for network delay simulation.
 */

export class Timer {
    /**
     * Constructor
     * @param {Object} config - Time configuration
     * @param {number} config.tickInterval - Tick interval (in milliseconds)
     */
    constructor(config = {}) {
        this.tickInterval = config.tickInterval || 1000; // Default to 1 tick per second
        this.currentTick = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        
        this.tickCallbacks = new Set();
        this.intervalId = null;
        
        this.stats = {
            totalTicks: 0,
            totalRunTime: 0,
            totalPausedTime: 0,
            averageTickInterval: 0
        };
    }

    /**
     * Starts the timer.
     * @returns {boolean} Whether the start was successful.
     */
    start() {
        if (this.isRunning) {
            console.warn('Timer is already running');
            return false;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.totalPausedTime = 0;
        
        this.intervalId = setInterval(() => {
            if (!this.isPaused) {
                this.tick();
            }
        }, this.tickInterval);
        
        console.log(`Timer started, tick interval: ${this.tickInterval}ms`);
        return true;
    }

    /**
     * Pauses the timer.
     * @returns {boolean} Whether the pause was successful.
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            console.warn('Timer is not running or is already paused');
            return false;
        }
        
        this.isPaused = true;
        this.pauseTime = Date.now();
        
        console.log(`Timer paused at tick ${this.currentTick}`);
        return true;
    }

    /**
     * Resumes the timer.
     * @returns {boolean} Whether the resume was successful.
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            console.warn('Timer is not paused');
            return false;
        }
        
        this.isPaused = false;
        
        if (this.pauseTime) {
            this.totalPausedTime += Date.now() - this.pauseTime;
            this.pauseTime = null;
        }
        
        console.log(`Timer resumed, current tick: ${this.currentTick}`);
        return true;
    }

    /**
     * Stops the timer.
     * @returns {boolean} Whether the stop was successful.
     */
    stop() {
        if (!this.isRunning) {
            console.warn('Timer is not running');
            return false;
        }
        
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.startTime) {
            const totalTime = Date.now() - this.startTime;
            this.stats.totalRunTime = totalTime - this.totalPausedTime;
            this.stats.totalPausedTime = this.totalPausedTime;
            this.stats.totalTicks = this.currentTick;
            
            if (this.currentTick > 0) {
                this.stats.averageTickInterval = this.stats.totalRunTime / this.currentTick;
            }
        }
        
        console.log(`Timer stopped, total ticks: ${this.currentTick}`);
        return true;
    }

    /**
     * Executes a tick.
     */
    tick() {
        this.currentTick++;
        
        for (const callback of this.tickCallbacks) {
            try {
                callback(this.currentTick);
            } catch (error) {
                console.error('Error in tick callback:', error);
            }
        }
    }

    /**
     * Registers a tick callback function.
     * @param {Function} callback - The callback function.
     * @returns {boolean} Whether the registration was successful.
     */
    onTick(callback) {
        if (typeof callback !== 'function') {
            console.error('Callback must be a function');
            return false;
        }
        
        this.tickCallbacks.add(callback);
        return true;
    }

    /**
     * Removes a tick callback function.
     * @param {Function} callback - The callback function to remove.
     * @returns {boolean} Whether the removal was successful.
     */
    offTick(callback) {
        return this.tickCallbacks.delete(callback);
    }

    /**
     * Gets the current tick count.
     * @returns {number} The current tick count.
     */
    getCurrentTick() {
        return this.currentTick;
    }

    /**
     * Sets the tick interval.
     * @param {number} interval - The new tick interval in milliseconds.
     * @returns {boolean} Whether the setting was successful.
     */
    setTickInterval(interval) {
        if (interval < 0) {
            console.error('Tick interval cannot be negative');
            return false;
        }
        
        const oldInterval = this.tickInterval;
        this.tickInterval = interval;
        
        if (this.isRunning) {
            const wasRunning = !this.isPaused;
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
            
            this.intervalId = setInterval(() => {
                if (!this.isPaused) {
                    this.tick();
                }
            }, this.tickInterval);
            
            console.log(`Tick interval changed from ${oldInterval}ms to ${interval}ms`);
        }
        
        return true;
    }

    /**
     * Calculates network delay in ticks.
     * @param {number} minTicks - The minimum delay in ticks.
     * @param {number} maxTicks - The maximum delay in ticks.
     * @returns {number} A random delay in ticks.
     */
    calculateNetworkDelay(minTicks = 1, maxTicks = 9) {
        const min = Math.max(1, minTicks);
        const max = Math.min(9, Math.max(min, maxTicks));
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Calculates the network broadcast time.
     * @param {Object} networkParams - The network parameters.
     * @returns {number} The estimated network broadcast time in ticks.
     */
    calculateBroadcastTime(networkParams) {
        const { nodeCount, avgConnections, maxDelay } = networkParams;
        
        if (!nodeCount || !avgConnections) {
            return maxDelay || 9;
        }
        
        const networkDepth = Math.ceil(Math.log(nodeCount) / Math.log(Math.max(2, avgConnections)));
        const broadcastTime = networkDepth * (maxDelay || 9);
        
        return Math.max(1, broadcastTime);
    }

    /**
     * Gets the timer status.
     * @returns {Object} The timer status information.
     */
    getTimerStatus() {
        const currentTime = Date.now();
        let runTime = 0;
        
        if (this.startTime) {
            if (this.isRunning) {
                const pausedTime = this.isPaused && this.pauseTime ? 
                    (currentTime - this.pauseTime) : 0;
                runTime = currentTime - this.startTime - this.totalPausedTime - pausedTime;
            } else {
                runTime = this.stats.totalRunTime;
            }
        }
        
        return {
            currentTick: this.currentTick,
            tickInterval: this.tickInterval,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            runTime,
            totalPausedTime: this.totalPausedTime,
            callbackCount: this.tickCallbacks.size,
            stats: { ...this.stats }
        };
    }

    /**
     * Resets the timer.
     */
    reset() {
        this.stop();
        this.currentTick = 0;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.tickCallbacks.clear();
        
        this.stats = {
            totalTicks: 0,
            totalRunTime: 0,
            totalPausedTime: 0,
            averageTickInterval: 0
        };
        
        console.log('Timer has been reset');
    }

    /**
     * Manually triggers a tick (for testing).
     */
    manualTick() {
        if (!this.isRunning) {
            console.warn('Timer is not running, cannot manually trigger a tick');
            return;
        }
        
        this.tick();
    }

    /**
     * Gets the difference between the actual and theoretical run times.
     * @returns {Object} The timing accuracy information.
     */
    getTimingAccuracy() {
        if (!this.startTime || this.currentTick === 0) {
            return { accuracy: 100, drift: 0 };
        }
        
        const theoreticalTime = this.currentTick * this.tickInterval;
        const actualTime = this.stats.totalRunTime || 
            (Date.now() - this.startTime - this.totalPausedTime);
        
        const drift = actualTime - theoreticalTime;
        const accuracy = Math.max(0, 100 - Math.abs(drift) / theoreticalTime * 100);
        
        return {
            accuracy: Math.round(accuracy * 100) / 100,
            drift: Math.round(drift),
            theoreticalTime,
            actualTime: Math.round(actualTime)
        };
    }
}
