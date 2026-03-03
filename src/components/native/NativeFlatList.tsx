import React, { useRef, useState, useEffect, useMemo, memo } from 'react';

interface NativeFlatListProps<T> {
    data: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    keyExtractor: (item: T, index: number) => string;
    itemHeight: number;
    className?: string;
    overscan?: number;
}

/**
 * RN_MOBILE_ELITE: High-performance virtualized list simulating React Native's FlatList.
 * Recycles DOM nodes and strictly renders only what is visible + overscan buffer.
 * Solves DOM bloat issues in deeply nested or infinite File Trees.
 */
function NativeFlatListInner<T>({
    data,
    renderItem,
    keyExtractor,
    itemHeight,
    className = "",
    overscan = 5
}: NativeFlatListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Initial height
        setContainerHeight(container.clientHeight);

        if (typeof ResizeObserver === "undefined") {
            const handleResize = () => setContainerHeight(container.clientHeight);
            window.addEventListener("resize", handleResize);
            return () => window.removeEventListener("resize", handleResize);
        }

        const observer = new ResizeObserver((entries) => {
            setContainerHeight(entries[0].contentRect.height);
        });
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // requestAnimationFrame ensures 60FPS sync for scrolling calculations
        window.requestAnimationFrame(() => {
            setScrollTop(e.currentTarget.scrollTop);
        });
    };

    const totalHeight = data.length * itemHeight;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
        data.length - 1,
        startIndex + visibleItemCount + (overscan * 2)
    );

    const visibleItems = useMemo(() => {
        const items = [];
        for (let i = startIndex; i <= endIndex; i++) {
            if (data[i]) {
                items.push({
                    item: data[i],
                    index: i,
                    offsetTop: i * itemHeight,
                });
            }
        }
        return items;
    }, [data, startIndex, endIndex, itemHeight]);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`relative overflow-y-auto transform-gpu contain-strict ${className}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
                {visibleItems.map(({ item, index, offsetTop }) => (
                    <div
                        key={keyExtractor(item, index)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${offsetTop}px)`,
                            height: `${itemHeight}px`,
                            willChange: 'transform'
                        }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
        </div>
    );
}

export const NativeFlatList = memo(NativeFlatListInner) as typeof NativeFlatListInner;
