import { getMediaUrl } from '@/lib/constants';
import type { Brand } from '@/lib/types';
import styles from './BrandHeader.module.css';

interface BrandHeaderProps {
    brand: Brand;
}

export default function BrandHeader({ brand }: BrandHeaderProps) {
    const logoUrl = getMediaUrl(brand.logo);

    return (
        <header className={styles.header}>
            <div className={styles.brandInfo}>
                <div className={styles.logoWrapper}>
                    <img
                        src={logoUrl || '/oono-logo.png'}
                        alt={brand.name}
                        className={styles.logo}
                        width={110}
                        height={110}
                    />
                </div>
                <div className={styles.textInfo}>
                    <h1 className={styles.name}>{brand.name}</h1>
                    {brand.description && (
                        <p className={styles.description}>{brand.description}</p>
                    )}
                </div>
            </div>
        </header>
    );
}
