import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Star, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CREDIT_PACKS, MAX_ADDON_QUANTITY } from '@/constants/addons';
import { cn } from '@/lib/utils';

interface CreditPacksSectionProps {
  currency?: 'USD'; // USD only globally
  formatPrice: (amount: number) => string;
}

export function CreditPacksSection({ currency, formatPrice }: CreditPacksSectionProps) {
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (packId: string) => quantities[packId] || 0;

  const updateQuantity = (packId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[packId] || 0;
      const newQty = Math.max(0, Math.min(MAX_ADDON_QUANTITY, current + delta));
      return { ...prev, [packId]: newQty };
    });
  };

  const handleBuyNow = (packId: string) => {
    const qty = getQuantity(packId);
    if (qty > 0) {
      navigate(`/purchase?type=credits&pack=${packId}&quantity=${qty}&currency=USD`);
    } else {
      navigate(`/purchase?type=credits&pack=${packId}&quantity=1&currency=USD`);
    }
  };

  return (
    <div className="mt-16">
      <div className="text-center mb-8">
        <Badge className="mb-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
          <Coins className="h-3 w-3 mr-1" />
          1:1 Credit Ratio • $1 = 1 Credit
        </Badge>
        <h2 className="text-2xl font-bold text-foreground font-orbitron">
          Need More Credits?
        </h2>
        <p className="text-muted-foreground mt-2">
          Buy credit packs instantly • No discounts apply • Max {MAX_ADDON_QUANTITY} per purchase
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto">
        {CREDIT_PACKS.map((pack, index) => {
          const qty = getQuantity(pack.id);
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Card
                className={cn(
                  'relative bg-card/80 backdrop-blur-md border-2 transition-all duration-500',
                  // AWS-style glow effect
                  'before:absolute before:-inset-[2px] before:rounded-[inherit] before:opacity-0 before:transition-opacity before:duration-500',
                  'group-hover:before:opacity-100',
                  pack.popular
                    ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20 before:bg-gradient-to-r before:from-yellow-500/50 before:via-orange-500/50 before:to-yellow-500/50 before:blur-xl group-hover:shadow-2xl group-hover:shadow-yellow-500/40'
                    : cn(
                        'border-border/50',
                        'before:bg-gradient-to-r before:from-yellow-500/30 before:via-amber-500/30 before:to-yellow-500/30 before:blur-xl',
                        'group-hover:border-yellow-500/50 group-hover:shadow-xl group-hover:shadow-yellow-500/20'
                      )
                )}
                style={{ isolation: 'isolate' }}
              >
                {pack.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 text-xs px-2">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}

                <CardContent className="p-4 text-center relative z-10">
                  <div className="w-10 h-10 mx-auto bg-yellow-500/10 rounded-xl flex items-center justify-center mb-3">
                    <Coins className="h-5 w-5 text-yellow-500" />
                  </div>

                  <h3 className="text-2xl font-bold text-foreground">{pack.credits}</h3>
                  <p className="text-xs text-muted-foreground mb-2">credits</p>

                  <p className="text-lg font-semibold text-foreground">
                    {formatPrice(pack.price)}
                  </p>
                  <p className="text-xs text-green-500 font-medium">
                    $1 = 1 credit
                  </p>

                  {/* Quantity Selector */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => updateQuantity(pack.id, -1)}
                      disabled={qty <= 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-full"
                      onClick={() => updateQuantity(pack.id, 1)}
                      disabled={qty >= MAX_ADDON_QUANTITY}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {qty > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: {formatPrice(pack.price * qty)} ({(pack.credits || 0) * qty} credits)
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 rounded-lg hover:bg-yellow-500/10 hover:border-yellow-500/50"
                    onClick={() => handleBuyNow(pack.id)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {qty > 0 ? `Buy ${qty}` : 'Buy Now'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
