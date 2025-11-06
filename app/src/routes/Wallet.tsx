import "@/assets/pages/quota.less";
import "@/assets/pages/subscription.less";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  BadgeMinus,
  CalendarClock,
  Crown,
  ExternalLink,
  InfoIcon,
  Star,
  Rocket,
  Zap,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { docsEndpoint } from "@/conf/env.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { infoRelayPlanSelector, useCurrency } from "@/store/info.ts";
import {
  expiredSelector,
  isSubscribedSelector,
  levelSelector,
  usageSelector,
  refreshSelector,
  refreshSubscription,
} from "@/store/subscription.ts";
import { subscriptionDataSelector } from "@/store/globals.ts";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { getPlan, getPlanName } from "@/conf/subscription.tsx";
import { Upgrade } from "@/components/home/subscription/UpgradePlan.tsx";
import SubscriptionUsage from "@/components/home/subscription/SubscriptionUsage.tsx";
import WalletQuotaBox from "@/routes/wallet/WalletQuotaBox.tsx";
import ModelAvatar from "@/components/ModelAvatar";
import Icon from "@/components/utils/Icon";
import Tips from "@/components/Tips";
import { Loader2 } from "lucide-react";
import { AppDispatch } from "@/store";

type PlanItemProps = {
  level: number;
  isYearly: boolean;
};

function PlanItem({ level, isYearly }: PlanItemProps) {
  const { t } = useTranslation();
  const current = useSelector(levelSelector);
  const subscriptionData = useSelector(subscriptionDataSelector);
  const { symbol } = useCurrency();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const plan = useMemo(
    () => getPlan(subscriptionData, level),
    [subscriptionData, level],
  );
  const name = useMemo(() => getPlanName(level), [level]);

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  const pricing = useMemo(() => {
    let discount = 1.0;
    if (isYearly) {
      if (plan.discounts && plan.discounts["12"] !== undefined) {
        discount = plan.discounts["12"];
      } else {
        discount = 0.8;
      }
    }
    
    const result = plan.price * discount;
    if (result % 1 !== 0) {
      return result.toFixed(1);
    }
    return result;
  }, [plan, isYearly]);

  return (
    <motion.div
      ref={ref}
      className={cn("plan relative shadow border rounded-lg mb-4", name)}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      <AnimatePresence>
        {level === 2 && (
          <motion.div
            className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold py-1 px-2 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.3,
              type: "spring",
              stiffness: 500,
              damping: 25,
            }}
          >
            {t("sub.best-choice")}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="w-fit mb-1 cursor-pointer"
      >
        <Icon
          icon={
            level === 1 ? (
              <Zap />
            ) : level === 2 ? (
              <Rocket />
            ) : level === 3 ? (
              <Crown />
            ) : (
              <Star />
            )
          }
          className={cn("w-10 h-10 p-2 border-2 rounded-lg", {
            "border-gold text-gold fill-gold/20 bg-gold/5": level === 3,
            "border-primary text-primary fill-primary/20 bg-primary/5":
              level === 2,
            "border-amber-600 text-amber-600 fill-amber-600/20 bg-amber-600/5":
              level === 1,
            "border-secondary text-secondary fill-secondary/20 bg-secondary/5":
              level === 0,
          })}
        />
      </motion.div>

      <motion.div className={`font-bold text-md`} variants={itemVariants}>
        {t(`sub.${name}`)}
      </motion.div>

      <motion.div
        className={`price mb-2 w-full flex items-end`}
        variants={itemVariants}
      >
        <span className="text-xl md:text-2xl">{symbol}</span>
        <motion.span
          className="text-2xl md:text-3xl font-bold mr-0.5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {pricing}
        </motion.span>
        <span className="text-sm font-medium">/{t("sub.month")}</span>

        {(() => {
          const plan = subscriptionData.find(p => p.level === level);
          let discountPercent = 0;
          
          if (plan && plan.discounts && plan.discounts["12"] !== undefined) {
            discountPercent = Math.round((1 - plan.discounts["12"]) * 100);
          } else if (isYearly) {
            discountPercent = 20;
          }
          
          return discountPercent > 0 ? (
            <motion.span
              className="text-xs text-secondary ml-auto !text-[#55b467] bg-[#f4fdeb] border border-[#55b467]/20 cursor-pointer rounded-sm px-1 py-0.5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t("sub.year-earn-tip", { percent: `${discountPercent}%` })}
            </motion.span>
          ) : null;
        })()}
      </motion.div>

      <Upgrade level={level} current={current} isYearly={isYearly} />

      <motion.div
        className={`flex flex-col mt-4 space-y-1.5`}
        variants={containerVariants}
      >
        <motion.p
          className="text-sm text-secondary flex items-center mb-1"
          variants={itemVariants}
        >
          {t("sub.including-model")}
          <Tips content={t("sub.including-model-tip")} />
        </motion.p>
        {plan.items.map((item, index) => (
          <motion.div
            key={index}
            className="flex items-center"
            variants={itemVariants}
          >
            <div className={`mr-1.5`}>
              <ModelAvatar
                model={{
                  id: item.id,
                  name: item.name,
                  avatar: item.icon,
                }}
                size={24}
              />
            </div>
            <p className="text-sm mr-auto">{item.name}</p>
            <p className="text-md font-medium">
              {item.value !== -1
                ? t("sub.plan-item-usage", { times: item.value })
                : t("sub.plan-item-unlimited-usage")}

              {item.value !== -1 && (
                <span className="text-xs text-secondary">
                  /{t("sub.month")}
                </span>
              )}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function WalletPlanBox() {
  const { t } = useTranslation();
  const subscription = useSelector(isSubscribedSelector);
  const level = useSelector(levelSelector);
  const expired = useSelector(expiredSelector);
  const refresh = useSelector(refreshSelector);
  const usage = useSelector(usageSelector);
  const [isYearly, setIsYearly] = useState(true);
  const subscriptionData = useSelector(subscriptionDataSelector);
  const relayPlan = useSelector(infoRelayPlanSelector);
  const dispatch = useDispatch<AppDispatch>();
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setSubscriptionLoading(true);
    dispatch(refreshSubscription()).finally(() => {
      if (mounted) {
        setSubscriptionLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  const plan = useMemo(
    () => getPlan(subscriptionData, level),
    [subscriptionData, level],
  );

  const planName = useMemo(() => getPlanName(level), [level]);
  const isSubscribed = useMemo(
    () => subscriptionData.length > 0 && level > 0,
    [subscriptionData, level],
  );

  const enablePlanFlag = subscriptionData.length > 0 || subscriptionLoading;

  if (!enablePlanFlag) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.1,
        delay: 0.25,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <motion.div
      className={`w-full h-max mt-0 border rounded-lg p-2.5 bg-background`}
      id={`plan`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <motion.div
          className="flex flex-col w-full p-2.5"
          variants={itemVariants}
        >
          <motion.div
            className="text-xs text-secondary mb-1"
            variants={itemVariants}
          >
            {t("sub.dialog-title")}
          </motion.div>
          <motion.div
            className="text-2xl font-medium mb-1 flex items-center"
            variants={itemVariants}
          >
            <Icon
              icon={
                subscriptionLoading ? (
                  <Loader2 />
                ) : isSubscribed ? (
                  <BadgeCheck />
                ) : (
                  <BadgeMinus />
                )
              }
              className={cn(
                "h-6 w-6 mr-1.5",
                subscriptionLoading
                  ? "text-muted-foreground animate-spin"
                  : isSubscribed
                    ? "text-green-500 fill-green-500/20"
                    : "text-muted-foreground fill-muted-foreground/20",
              )}
            />
            <p>{subscriptionLoading ? t("loading") : t(`sub.${planName}`)}</p>
          </motion.div>

          {!relayPlan && (
            <motion.div
              className={`text-xs text-secondary mt-auto break-all whitespace-pre-wrap`}
              variants={itemVariants}
            >
              <InfoIcon className="h-3 w-3 inline-block mr-1" />
              {t("sub.plan-not-support-relay")}
            </motion.div>
          )}
          <motion.div
            className={`text-xs text-secondary mt-auto break-all whitespace-pre-wrap`}
            variants={itemVariants}
          >
            {t("buy.plan-info")}
            <a
              href={docsEndpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sky-500 hover:text-sky-600"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-0.5 ml-1 inline-block" />
              {t("buy.learn-more")}
            </a>
          </motion.div>
        </motion.div>

        <motion.div className={`sub-wrapper px-2`} variants={itemVariants}>
          {subscription && (
            <Accordion
              type="single"
              collapsible
              defaultValue="sub-items"
              className={`w-full sub-row border rounded-lg mt-2 !px-0 !pt-0`}
            >
              <AccordionItem value="sub-items" className="border-none w-full">
                <AccordionTrigger
                  className={`w-full text-left justify-start pl-4 pr-6 bg-muted/25 border-b flex items-center`}
                >
                  <CalendarClock className="h-8 w-8 mr-2 stroke-[1.5] !rotate-0" />
                  <div className="ml-2 mr-auto">
                    <h3 className="text-sm mb-0.5">{t("sub.quota-manage")}</h3>
                    <p className="text-xs text-secondary">
                      {t("sub.expired-days", { days: expired })}
                    </p>
                    <p className="text-xs text-secondary">
                      {refresh > 0
                        ? t("sub.refresh-days", { refresh_days: refresh })
                        : t("sub.get-refresh-days")}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 h-fit">
                  <div
                    className={`sub-items-wrapper p-2 px-4 pt-4 w-full h-fit grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-x-4`}
                  >
                    {plan.items.map(
                      (item, index) =>
                        usage?.[item.id] && (
                          <SubscriptionUsage
                            name={item.name}
                            usage={usage?.[item.id]}
                            key={index}
                          />
                        ),
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <motion.div
            className="w-fit mx-auto mt-4 mb-2.5"
            variants={itemVariants}
          >
            <Tabs
              value={isYearly ? "yearly" : "monthly"}
              onValueChange={(value) => setIsYearly(value === "yearly")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="yearly">
                  {t("sub.year-plan")}
                  {(() => {
                    const firstPlan = subscriptionData.find(p => p.level > 0);
                    let discountPercent = 20;
                    
                    if (firstPlan && firstPlan.discounts && firstPlan.discounts["12"] !== undefined) {
                      discountPercent = Math.round((1 - firstPlan.discounts["12"]) * 100);
                    }
                    
                    return discountPercent > 0 ? (
                      <p className="text-xs text-secondary !text-[#55b467] !bg-[#f4fdeb] !border !border-[#55b467]/20 px-1 py-0.5 rounded-sm ml-2">
                        -{discountPercent}%
                      </p>
                    ) : null;
                  })()}
                </TabsTrigger>
                <TabsTrigger value="monthly">{t("sub.month-plan")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>
          <motion.div className={`plan-wrapper`} variants={itemVariants}>
            {subscriptionData.map((item, index) => (
              <PlanItem key={index} level={item.level} isYearly={isYearly} />
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Wallet() {
  return (
    <ScrollArea className={`w-full h-full flex flex-col p-2 pr-4 bg-muted/25`}>
      <div className={`w-full h-fit max-w-5xl mx-auto py-2 md:py-6`}>
        <WalletQuotaBox />
        <WalletPlanBox />
      </div>
    </ScrollArea>
  );
}

export default Wallet;
