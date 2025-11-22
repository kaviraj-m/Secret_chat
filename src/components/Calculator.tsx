'use client';

import { useState } from 'react';

interface CalculatorProps {
  onSecretTrigger: () => void;
  onClearChat?: () => void;
}

export default function Calculator({ onSecretTrigger, onClearChat }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const SECRET_TRIGGER_VALUES = [58]; // Secret number that unlocks chat (29+29)
  const CLEAR_CHAT_VALUE = 1010; // Secret number that clears all chat

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
      
      const roundedValue = Math.round(newValue);
      
      // Check for clear chat trigger
      if (roundedValue === CLEAR_CHAT_VALUE && onClearChat) {
        onClearChat();
      }
      // Check for secret trigger
      else if (SECRET_TRIGGER_VALUES.includes(roundedValue)) {
        onSecretTrigger();
      }
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
      
      const roundedValue = Math.round(newValue);
      
      // Check for clear chat trigger
      if (roundedValue === CLEAR_CHAT_VALUE && onClearChat) {
        onClearChat();
      }
      // Check for secret trigger
      else if (SECRET_TRIGGER_VALUES.includes(roundedValue)) {
        onSecretTrigger();
      }
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  // Create expression display
  const getExpressionDisplay = () => {
    if (previousValue !== null && operation) {
      return `${previousValue} ${operation === '+' ? '+' : operation === '-' ? '−' : operation === '*' ? '×' : '÷'}`;
    }
    return '';
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6">
      <div className="mb-6">
        {getExpressionDisplay() && (
          <div className="text-right text-lg font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-t-lg p-2 px-4 min-h-[40px] flex items-center justify-end overflow-x-auto">
            {getExpressionDisplay()}
          </div>
        )}
        <div className={`text-right text-4xl font-mono font-bold text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-800 ${getExpressionDisplay() ? 'rounded-b-lg rounded-t-none' : 'rounded-lg'} p-4 min-h-[80px] flex items-center justify-end overflow-x-auto`}>
          {display}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={clear}
          className="col-span-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 rounded-lg transition-colors"
        >
          Clear
        </button>
        <button
          onClick={() => inputOperation('/')}
          className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          ÷
        </button>
        <button
          onClick={() => inputOperation('*')}
          className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          ×
        </button>
        
        <button onClick={() => inputNumber('7')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">7</button>
        <button onClick={() => inputNumber('8')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">8</button>
        <button onClick={() => inputNumber('9')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">9</button>
        <button
          onClick={() => inputOperation('-')}
          className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          −
        </button>
        
        <button onClick={() => inputNumber('4')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">4</button>
        <button onClick={() => inputNumber('5')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">5</button>
        <button onClick={() => inputNumber('6')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">6</button>
        <button
          onClick={() => inputOperation('+')}
          className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          +
        </button>
        
        <button onClick={() => inputNumber('1')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">1</button>
        <button onClick={() => inputNumber('2')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">2</button>
        <button onClick={() => inputNumber('3')} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors">3</button>
        <button
          onClick={performCalculation}
          className="row-span-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 rounded-lg transition-colors"
        >
          =
        </button>
        
        <button
          onClick={() => inputNumber('0')}
          className="col-span-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-50 font-semibold py-4 rounded-lg transition-colors"
        >
          .
        </button>
      </div>
    </div>
  );
}

