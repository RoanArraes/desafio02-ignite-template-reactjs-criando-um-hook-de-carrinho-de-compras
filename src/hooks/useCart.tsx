import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getStockProduct = async(productId: number) => {
    const response = await api.get<Product>(`/stock/${productId}`)
    return response.data.amount;
  }

  const addProduct = async (productId: number) => {
    try {
      const cartEdited = [...cart];
      const productFindedInListIndex = cart.findIndex(product => product.id === productId);
      const responseProductStock = await api.get<Stock>(`/stock/${productId}`);

      if(productFindedInListIndex >= 0) {
        if(responseProductStock.data.amount > cartEdited[productFindedInListIndex].amount) {
          cartEdited[productFindedInListIndex].amount += 1;
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartEdited));
          setCart(cartEdited);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      } else {
        const responseProduct = await api.get<Product>(`/products/${productId}`)
        cartEdited.push({
          ...responseProduct.data,
          amount: 1
        });
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartEdited));
        setCart(cartEdited);
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(cart.find(product => product.id === productId)) {
        const cartEdited = cart.filter( product => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartEdited));
        setCart(cartEdited);
      } else {
        throw Error;
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const cartEdited = [...cart];
      const productStock = await getStockProduct(productId);
      const productFindedInListIndex = cartEdited.findIndex(product => product.id === productId);

      if(productFindedInListIndex >= 0) {
        if(amount && (amount <= productStock)) {
          cartEdited[productFindedInListIndex].amount = amount;
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartEdited));
          setCart(cartEdited);
        }
        else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
