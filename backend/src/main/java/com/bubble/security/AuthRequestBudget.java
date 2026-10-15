package com.bubble.security;

import java.util.HashMap;
import java.util.Map;
import java.util.function.LongSupplier;

/** Bounded, process-local, monotonic fixed-window budget. No credential/email keys. */
public final class AuthRequestBudget {
    private final int addressLimit;
    private final int totalLimit;
    private final LongSupplier nanos;
    private final Map<String, Integer> counts = new HashMap<>();
    private long started;
    private int total;
    public AuthRequestBudget(int addressLimit, int totalLimit) { this(addressLimit, totalLimit, System::nanoTime); }
    public AuthRequestBudget(int addressLimit, int totalLimit, LongSupplier nanos) {
        this.addressLimit = addressLimit; this.totalLimit = totalLimit; this.nanos = nanos; started = nanos.getAsLong();
    }
    public synchronized boolean acquire(String address) {
        long now = nanos.getAsLong();
        if (now - started >= 60_000_000_000L) { counts.clear(); total = 0; started = now; }
        int used = counts.getOrDefault(address, 0);
        if (total >= totalLimit || used >= addressLimit || (!counts.containsKey(address) && counts.size() >= 1024)) return false;
        counts.put(address, used + 1); total++; return true;
    }
}
