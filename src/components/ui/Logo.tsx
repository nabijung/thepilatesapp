
import Image from 'next/image';

interface LogoProps {
    width?: number;
    height?: number;
    textClasses?: string
}

const Logo = ({ width, height, textClasses }: LogoProps) => (
    <div className='flex items-center'>
        <Image
            src="/assets/prospire-logo.svg"
            alt="Prospire"
            width={width || 23}
            height={height || 35}
        />
        <div className={`text-[30px] text-[#00474E] font-[700] ml-2 ${textClasses}`}>
            prospire
        </div>
    </div>
)

export default Logo