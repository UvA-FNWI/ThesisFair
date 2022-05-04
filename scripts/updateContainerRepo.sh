root=$1

if [[ -z $root ]]; then
  echo "Missing directory parameter"
  exit 1
fi

for dir in $root/*; do
  if [[ ! -e $root/$dir/Makefile ]]; then
    continue
  fi

  make -C $root/$dir build
  make -C $root/$dir push
done
