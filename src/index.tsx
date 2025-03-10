import React from 'react';
import {
  useContext,
  LoadingOverlay,
  ErrorOverlay,
  usePrompts,
  useQuery
} from '@incorta-org/component-sdk';
import AdvancedTable from './AdvancedTable';
import './styles.less';

export default () => {
  const { prompts, drillDown } = usePrompts();
  const { data, context, isLoading, isError, error, conditionalFormattingDictionary } =
    useQuery(useContext(), prompts) as any;

  return (
    <ErrorOverlay isError={isError} error={error}>
      <LoadingOverlay isLoading={isLoading} data={data}>
        {context && data ? (
          <AdvancedTable 
            data={data} 
            context={context} 
            prompts={prompts} 
            drillDown={drillDown}
            conditionalFormattingDictionary={conditionalFormattingDictionary}
          />
        ) : null}
      </LoadingOverlay>
    </ErrorOverlay>
  );
};
