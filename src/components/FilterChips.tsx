'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './FilterChips.module.css';

interface FilterChipsProps {
    labels: string[];
    activeFilter: string;
    onFilterChange: (filter: string) => void;
}

export default function FilterChips({ labels, activeFilter, onFilterChange }: FilterChipsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setShowLeftShadow(el.scrollLeft > 4);
        setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    return (
        <div className={styles.wrapper}>
            {showLeftShadow && <div className={styles.shadowLeft} />}
            {showRightShadow && <div className={styles.shadowRight} />}
            <div
                className={styles.scrollContainer}
                ref={scrollRef}
                onScroll={checkScroll}
            >
                <button
                    className={`${styles.chip} ${activeFilter === 'All' ? styles.active : ''}`}
                    onClick={() => onFilterChange('All')}
                >
                    All
                </button>
                {labels.map((label, index) => (
                    <button
                        key={`${label}-${index}`}
                        className={`${styles.chip} ${activeFilter === label ? styles.active : ''}`}
                        onClick={() => onFilterChange(label)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
