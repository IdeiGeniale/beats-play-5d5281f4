import { motion } from 'framer-motion';

export const Logo = () => {
  return (
    <motion.div 
      className="flex flex-col items-center"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Main Logo */}
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-3xl bg-primary/30 rounded-full scale-150" />
        
        {/* Logo text */}
        <h1 className="relative font-display text-7xl md:text-9xl font-black tracking-tighter">
          <span className="text-gradient-primary">BEATS</span>
          <span className="text-foreground">66</span>
        </h1>
        
        {/* Decorative elements */}
        <motion.div 
          className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-secondary"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-2 -left-6 w-4 h-4 rounded-full bg-accent"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>
      
      {/* Tagline */}
      <motion.p 
        className="mt-4 text-lg md:text-xl font-body text-muted-foreground tracking-[0.3em] uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        Feel the Rhythm
      </motion.p>
      
      {/* Animated underline */}
      <motion.div 
        className="mt-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
        initial={{ width: 0 }}
        animate={{ width: "200px" }}
        transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
      />
    </motion.div>
  );
};
